import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { checkAssignment, confirmWindow, type DayTour } from "@schedule/core";
import { prisma, type Tx } from "../db";
import { requireAdmin, requireUser } from "../auth";
import { loadGuides, loadSettings, loadSlots } from "../context";
import { HttpError, toIso } from "../util";

const dayTours = async (db: Tx | typeof prisma, cityId: string, guideId: string, date: Date): Promise<DayTour[]> => {
  const [rows, slots] = await Promise.all([
    db.assignment.findMany({
      where: { guideId, withdrawn: false, occurrence: { date, status: "ACTIVE", needed: { gt: 0 } } },
      include: { occurrence: true },
    }),
    loadSlots(db, cityId),
  ]);
  const byId = new Map(slots.map((s) => [s.id, s]));
  return rows.flatMap((r) => {
    const slot = byId.get(r.occurrence.slotId);
    return slot ? [{ occurrenceId: r.occurrenceId, slot }] : [];
  });
};

export const assignmentRoutes = async (app: FastifyInstance): Promise<void> => {
  app.patch("/occurrences/:id", async (req) => {
    await requireAdmin(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z
      .object({
        status: z.enum(["ACTIVE", "NO_DEMAND"]).optional(),
        note: z.string().max(300).nullable().optional(),
        needed: z.number().int().min(0).max(50).optional(),
        adminConfirmed: z.boolean().optional(),
      })
      .parse(req.body);
    const { adminConfirmed, ...fields } = body;
    return prisma.$transaction(async (tx) => {
      if (body.needed === 0) await tx.assignment.deleteMany({ where: { occurrenceId: id } });
      const resets = body.status !== undefined || body.needed !== undefined;
      const data = adminConfirmed !== undefined ? { ...fields, adminConfirmedAt: adminConfirmed ? new Date() : null } : resets ? { ...fields, adminConfirmedAt: null } : fields;
      return tx.slotOccurrence.update({ where: { id }, data, select: { id: true, status: true, note: true, needed: true, adminConfirmedAt: true } });
    });
  });

  app.get("/occurrences/:id/candidates", async (req) => {
    await requireAdmin(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const occ = await prisma.slotOccurrence.findUnique({ where: { id }, include: { slot: { include: { tour: true } }, assignments: true } });
    if (!occ) throw new HttpError(404, "Ocorrência não encontrada.");
    const cityId = occ.slot.tour.cityId;
    const [guides, settings, slots, dayRows] = await Promise.all([
      loadGuides(prisma, cityId),
      loadSettings(prisma),
      loadSlots(prisma, cityId),
      prisma.assignment.findMany({
        where: { withdrawn: false, occurrence: { date: occ.date, status: "ACTIVE", needed: { gt: 0 }, slot: { tour: { cityId } } } },
        include: { occurrence: true },
      }),
    ]);
    const slotById = new Map(slots.map((s) => [s.id, s]));
    const byGuide = new Map<string, DayTour[]>();
    for (const r of dayRows) {
      const s = slotById.get(r.occurrence.slotId);
      if (!s) continue;
      byGuide.set(r.guideId, [...(byGuide.get(r.guideId) ?? []), { occurrenceId: r.occurrenceId, slot: s }]);
    }
    const slot = {
      id: occ.slot.id,
      tourId: occ.slot.tourId,
      tourKind: occ.slot.tour.kind,
      languageId: occ.slot.languageId,
      startMinutes: occ.slot.startMinutes,
      durationMin: occ.slot.durationMin,
    };
    const taken = new Set(occ.assignments.filter((a) => !a.withdrawn).map((a) => a.guideId));
    const dateIso = toIso(occ.date);
    return guides
      .filter((g) => !taken.has(g.id))
      .map((g) => ({
        guideId: g.id,
        name: g.name ?? "",
        violations: checkAssignment(g, occ.id, slot, dateIso, byGuide.get(g.id) ?? [], settings),
      }));
  });

  app.post("/occurrences/:id/assignments", async (req) => {
    await requireAdmin(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ guideId: z.string(), override: z.boolean().default(false) }).parse(req.body);
    return prisma.$transaction(async (tx) => {
      const occ = await tx.slotOccurrence.findUnique({ where: { id }, include: { slot: { include: { tour: true } } } });
      if (!occ) throw new HttpError(404, "Ocorrência não encontrada.");
      const cityId = occ.slot.tour.cityId;
      if (occ.status === "NO_DEMAND") throw new HttpError(400, "Ocorrência marcada como NT. Reative-a antes de atribuir.");
      const [[guide], slots, settings, tours] = await Promise.all([
        loadGuides(tx, cityId, [body.guideId]),
        loadSlots(tx, cityId),
        loadSettings(tx),
        dayTours(tx, cityId, body.guideId, occ.date),
      ]);
      const slot = slots.find((s) => s.id === occ.slotId);
      if (!guide || !slot) throw new HttpError(404, "Guia inválido ou de outra cidade.");
      const violations = checkAssignment(guide, occ.id, slot, toIso(occ.date), tours, settings);
      if (violations.some((v) => v.code === "DUPLICATE")) throw new HttpError(409, "Guia já atribuído a esta ocorrência.");
      if (violations.length > 0 && !body.override) throw new HttpError(409, "A atribuição viola regras.", { violations });
      await tx.slotOccurrence.update({ where: { id }, data: { adminConfirmedAt: null } });
      const a = await tx.assignment.create({
        data: {
          occurrenceId: id,
          guideId: body.guideId,
          source: "MANUAL",
          overrideWarnings: violations.length ? violations.map((v) => ({ code: v.code, message: v.message })) : undefined,
        },
      });
      return { id: a.id, violations };
    });
  });

  app.patch("/assignments/:id", async (req) => {
    await requireAdmin(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ withdrawn: z.boolean() }).parse(req.body);
    return prisma.$transaction(async (tx) => {
      const a = await tx.assignment.findUnique({ where: { id } });
      if (!a) throw new HttpError(404, "Atribuição não encontrada.");
      if (!body.withdrawn) {
        const dup = await tx.assignment.findFirst({ where: { occurrenceId: a.occurrenceId, guideId: a.guideId, withdrawn: false, NOT: { id } } });
        if (dup) throw new HttpError(409, "Guia já atribuído a esta ocorrência.");
      }
      await tx.slotOccurrence.update({ where: { id: a.occurrenceId }, data: { adminConfirmedAt: null } });
      return tx.assignment.update({
        where: { id },
        data: {
          withdrawn: body.withdrawn,
          withdrawnAt: body.withdrawn ? new Date() : null,
          ...(body.withdrawn !== a.withdrawn ? { confirmedAt: null } : {}),
        },
        select: { id: true, withdrawn: true },
      });
    });
  });

  app.post("/assignments/:id/confirm", async (req) => {
    const u = await requireUser(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { confirmed } = z.object({ confirmed: z.boolean() }).parse(req.body);
    const a = await prisma.assignment.findUnique({
      where: { id },
      include: { occurrence: { include: { slot: true, month: true } } },
    });
    if (!a || a.guideId !== u.id) throw new HttpError(404, "Atribuição não encontrada.");
    const o = a.occurrence;
    if (a.withdrawn || o.status !== "ACTIVE" || o.needed <= 0 || o.month.status !== "PUBLISHED")
      throw new HttpError(409, "Este tour não pode ser confirmado.");
    const settings = await loadSettings(prisma);
    const win = confirmWindow(new Date(), toIso(o.date), o.slot.startMinutes, o.slot.durationMin, settings.confirmWindowHours);
    if (win.state === "NOT_YET") throw new HttpError(409, "A confirmação ainda não está aberta para este tour.");
    if (win.state === "ENDED") throw new HttpError(409, "Este tour já terminou.");
    await prisma.assignment.update({ where: { id }, data: { confirmedAt: confirmed ? new Date() : null } });
    return { ok: true };
  });

  app.delete("/assignments/:id", async (req) => {
    await requireAdmin(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const a = await prisma.assignment.findUnique({ where: { id }, select: { occurrenceId: true } });
    await prisma.$transaction([
      prisma.assignment.deleteMany({ where: { id } }),
      ...(a ? [prisma.slotOccurrence.update({ where: { id: a.occurrenceId }, data: { adminConfirmedAt: null } })] : []),
    ]);
    return { ok: true };
  });
};
