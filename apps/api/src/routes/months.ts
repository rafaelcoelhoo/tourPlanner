import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { computeStats, confirmWindow, generateSchedule, weekdayOf } from "@schedule/core";
import { prisma } from "../db";
import { requireAdmin, requireUser } from "../auth";
import { loadGuides, loadMonth, loadSettings, loadSlots, monthRange } from "../context";
import { buildViews, occInclude } from "../views";
import { HttpError, fromIso, toIso } from "../util";

const ymOnly = z.object({ year: z.coerce.number().int().min(2020).max(2100), month: z.coerce.number().int().min(1).max(12) });
const ym = ymOnly.extend({ cityId: z.string() });
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const monthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/cities/:cityId/months/:year/:month", async (req) => {
    await requireAdmin(req);
    const { cityId, year, month } = ym.parse(req.params);
    const m = await prisma.monthSchedule.findUnique({
      where: { cityId_year_month: { cityId, year, month } },
      include: { occurrences: { include: occInclude, orderBy: { date: "asc" } } },
    });
    if (!m) return { year, month, status: "NEEDS_DRAFT", needsConfirmedAt: null, publishedAt: null, occurrences: [], stats: [] };
    const [occurrences, guides, slots, data, settings] = await Promise.all([
      buildViews(cityId, m.occurrences),
      loadGuides(prisma, cityId),
      loadSlots(prisma, cityId),
      loadMonth(prisma, cityId, year, month),
      loadSettings(prisma),
    ]);
    const stats = data ? computeStats(guides, slots, data.occurrences, data.assignments, data.dates, settings.morningCutoffMinutes) : [];
    const names = new Map(guides.map((g) => [g.id, g.name ?? ""]));
    return {
      year,
      month,
      status: m.status,
      needsConfirmedAt: m.needsConfirmedAt,
      publishedAt: m.publishedAt,
      occurrences,
      stats: stats.map((s) => ({ ...s, name: names.get(s.guideId) ?? "" })),
    };
  });

  app.get("/cities/:cityId/months/:year/:month/needs", async (req) => {
    await requireAdmin(req);
    const { cityId, year, month } = ym.parse(req.params);
    const [m, slots] = await Promise.all([
      prisma.monthSchedule.findUnique({ where: { cityId_year_month: { cityId, year, month } }, include: { occurrences: true } }),
      prisma.tourSlot.findMany({ where: { active: true, tour: { cityId } } }),
    ]);
    const existing = new Map((m?.occurrences ?? []).map((o) => [`${o.slotId}|${toIso(o.date)}`, o]));
    const slotsWithOccs = new Set((m?.occurrences ?? []).map((o) => o.slotId));
    const dates = Array.from({ length: new Date(Date.UTC(year, month, 0)).getUTCDate() }, (_, i) =>
      `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
    );
    const cells = slots.flatMap((s) =>
      dates.flatMap((date) => {
        const o = existing.get(`${s.id}|${date}`);
        if (o) return [{ slotId: s.id, date, needed: o.needed, status: o.status }];
        if (!slotsWithOccs.has(s.id) && s.weekdays.includes(weekdayOf(date)))
          return [{ slotId: s.id, date, needed: s.defaultNeeded, status: "ACTIVE" as const }];
        return [];
      }),
    );
    return { year, month, status: m?.status ?? "NEEDS_DRAFT", confirmed: Boolean(m?.needsConfirmedAt), cells };
  });

  app.put("/cities/:cityId/months/:year/:month/needs", async (req) => {
    await requireAdmin(req);
    const { cityId, year, month } = ym.parse(req.params);
    const body = z
      .object({
        confirm: z.boolean().default(false),
        cells: z.array(z.object({ slotId: z.string(), date: isoDate, needed: z.number().int().min(0).max(50) })),
      })
      .parse(req.body);
    const prefix = `${year}-${String(month).padStart(2, "0")}-`;
    if (body.cells.some((c) => !c.date.startsWith(prefix))) throw new HttpError(400, "Data fora do mês.");
    await prisma.$transaction(async (tx) => {
      const m = await tx.monthSchedule.upsert({ where: { cityId_year_month: { cityId, year, month } }, update: {}, create: { cityId, year, month } });
      const existing = await tx.slotOccurrence.findMany({ where: { monthId: m.id } });
      const byKey = new Map(existing.map((o) => [`${o.slotId}|${toIso(o.date)}`, o]));
      for (const c of body.cells) {
        const o = byKey.get(`${c.slotId}|${c.date}`);
        if (o) {
          if (o.needed !== c.needed) {
            await tx.slotOccurrence.update({ where: { id: o.id }, data: { needed: c.needed } });
            if (c.needed === 0) await tx.assignment.deleteMany({ where: { occurrenceId: o.id } });
          }
        } else if (c.needed > 0) {
          await tx.slotOccurrence.create({ data: { monthId: m.id, slotId: c.slotId, date: fromIso(c.date), needed: c.needed } });
        }
      }
      if (body.confirm) await tx.monthSchedule.update({ where: { id: m.id }, data: { needsConfirmedAt: new Date() } });
    });
    return { ok: true };
  });

  app.post("/cities/:cityId/months/:year/:month/generate", async (req) => {
    await requireAdmin(req);
    const { cityId, year, month } = ym.parse(req.params);
    return prisma.$transaction(async (tx) => {
      const m = await tx.monthSchedule.findUnique({ where: { cityId_year_month: { cityId, year, month } } });
      if (!m?.needsConfirmedAt) throw new HttpError(409, "Confirme primeiro a matriz de necessidades.");
      if (m.status === "PUBLISHED") throw new HttpError(409, "Mês já publicado. Despublique antes de gerar novamente.");
      await tx.assignment.deleteMany({ where: { occurrence: { monthId: m.id } } });
      await tx.slotOccurrence.updateMany({ where: { monthId: m.id }, data: { adminConfirmedAt: null } });
      const [data, guides, slots, settings] = await Promise.all([
        loadMonth(tx, cityId, year, month),
        loadGuides(tx, cityId),
        loadSlots(tx, cityId),
        loadSettings(tx),
      ]);
      if (!data) throw new HttpError(409, "Sem dados do mês.");
      const result = generateSchedule({
        slots,
        occurrences: data.occurrences,
        guides,
        dates: data.dates,
        settings,
      });
      await tx.assignment.createMany({
        data: result.assignments.map((a) => ({ occurrenceId: a.occurrenceId, guideId: a.guideId, source: "GENERATED" as const })),
      });
      await tx.monthSchedule.update({ where: { id: m.id }, data: { status: "DRAFT", generatedAt: new Date() } });
      return {
        assigned: result.assignments.length,
        incomplete: result.incomplete,
        missingTotal: result.incomplete.reduce((s, i) => s + i.missing, 0),
      };
    });
  });

  app.post("/cities/:cityId/months/:year/:month/publish", async (req) => {
    await requireAdmin(req);
    const { cityId, year, month } = ym.parse(req.params);
    const body = z.object({ publish: z.boolean().default(true), force: z.boolean().default(false) }).parse(req.body ?? {});
    const m = await prisma.monthSchedule.findUnique({
      where: { cityId_year_month: { cityId, year, month } },
      include: { occurrences: { include: occInclude } },
    });
    if (!m || m.status === "NEEDS_DRAFT") throw new HttpError(409, "Gere um rascunho antes de publicar.");
    if (body.publish && !body.force) {
      const views = await buildViews(cityId, m.occurrences);
      const warnings = views.flatMap((o) =>
        o.assignments
          .filter((a) => !a.withdrawn && a.warnings.length > 0)
          .map((a) => ({ date: o.date, slotId: o.slotId, guideName: a.guideName, codes: a.warnings.map((w) => w.code) })),
      );
      const missingTotal = views.reduce((s, o) => s + o.missing, 0);
      if (warnings.length > 0 || missingTotal > 0)
        throw new HttpError(409, "O mês tem avisos por resolver.", { publishCheck: { warningCount: warnings.length, missingTotal, warnings: warnings.slice(0, 20) } });
    }
    await prisma.monthSchedule.update({
      where: { id: m.id },
      data: body.publish ? { status: "PUBLISHED", publishedAt: new Date() } : { status: "DRAFT", publishedAt: null },
    });
    return { ok: true };
  });

  app.get("/cities/:cityId/days/:date", async (req) => {
    await requireAdmin(req);
    const { cityId, date } = z.object({ cityId: z.string(), date: isoDate }).parse(req.params);
    const [y, mo] = date.split("-").map(Number) as [number, number];
    const [rows, month] = await Promise.all([
      prisma.slotOccurrence.findMany({
        where: { date: fromIso(date), needed: { gt: 0 }, slot: { tour: { cityId } } },
        include: occInclude,
        orderBy: { slot: { startMinutes: "asc" } },
      }),
      prisma.monthSchedule.findUnique({ where: { cityId_year_month: { cityId, year: y, month: mo } }, select: { status: true } }),
    ]);
    return { date, monthStatus: month?.status ?? "NEEDS_DRAFT", occurrences: await buildViews(cityId, rows) };
  });

  app.post("/cities/:cityId/days/:date/confirm", async (req) => {
    await requireAdmin(req);
    const { cityId, date } = z.object({ cityId: z.string(), date: isoDate }).parse(req.params);
    const { confirmed } = z.object({ confirmed: z.boolean() }).parse(req.body);
    const r = await prisma.slotOccurrence.updateMany({
      where: { date: fromIso(date), status: "ACTIVE", needed: { gt: 0 }, slot: { tour: { cityId } } },
      data: { adminConfirmedAt: confirmed ? new Date() : null },
    });
    return { count: r.count };
  });

  app.get("/me/schedule", async (req) => {
    const u = await requireUser(req);
    const { year, month } = ymOnly.parse(req.query);
    if (!u.cityId) return { year, month, items: [] };
    const rows = await prisma.slotOccurrence.findMany({
      where: {
        date: monthRange(year, month),
        needed: { gt: 0 },
        month: { status: "PUBLISHED", cityId: u.cityId },
        assignments: { some: { guideId: u.id } },
      },
      include: { assignments: { include: { guide: { select: { id: true, name: true } } } } },
      orderBy: [{ date: "asc" }, { slot: { startMinutes: "asc" } }],
    });
    const [slots, settings] = await Promise.all([loadSlots(prisma, u.cityId), loadSettings(prisma)]);
    const slotById = new Map(slots.map((s) => [s.id, s]));
    const now = new Date();
    const items = rows.flatMap((o) => {
      const mine = o.assignments.find((a) => a.guideId === u.id);
      if (!mine || (mine.withdrawn && o.status === "ACTIVE")) return [];
      const slot = slotById.get(o.slotId);
      const win = slot && o.status === "ACTIVE" ? confirmWindow(now, toIso(o.date), slot.startMinutes, slot.durationMin, settings.confirmWindowHours) : null;
      return [
        {
          assignmentId: mine.id,
          confirmedAt: mine.confirmedAt ? mine.confirmedAt.toISOString() : null,
          confirm: win ? { state: win.state, opensAt: win.opensAt.toISOString() } : null,
          adminConfirmed: o.adminConfirmedAt !== null && o.status === "ACTIVE",
          occurrenceId: o.id,
          slotId: o.slotId,
          date: toIso(o.date),
          status: o.status,
          note: o.note,
          colleagues: o.assignments.filter((a) => !a.withdrawn && a.guideId !== u.id).map((a) => a.guide.name),
        },
      ];
    });
    return { year, month, items };
  });
};
