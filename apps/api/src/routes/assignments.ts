import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { checkAssignment, type DayTour } from "@schedule/core";
import { prisma, type Tx } from "../db";
import { requireAdmin } from "../auth";
import { loadGuides, loadSettings, loadSlots } from "../context";
import { HttpError, toIso } from "../util";

const dayTours = async (db: Tx | typeof prisma, cityId: string, guideId: string, date: Date): Promise<DayTour[]> => {
  const [rows, slots] = await Promise.all([
    db.assignment.findMany({
      where: { guideId, withdrawn: false, occurrence: { date, status: "ACTIVE" } },
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
      .object({ status: z.enum(["ACTIVE", "NO_DEMAND"]).optional(), note: z.string().max(300).nullable().optional(), needed: z.number().int().min(0).max(50).optional() })
      .parse(req.body);
    return prisma.slotOccurrence.update({ where: { id }, data: body, select: { id: true, status: true, note: true, needed: true } });
  });

  app.get("/occurrences/:id/candidates", async (req) => {
    await requireAdmin(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const occ = await prisma.slotOccurrence.findUnique({ where: { id }, include: { slot: { include: { tour: true } }, assignments: true } });
    if (!occ) throw new HttpError(404, "Ocorrência não encontrada.");
    const [guides, settings] = await Promise.all([loadGuides(prisma, occ.slot.tour.cityId), loadSettings(prisma)]);
    const slot = {
      id: occ.slot.id,
      tourId: occ.slot.tourId,
      tourKind: occ.slot.tour.kind,
      languageId: occ.slot.languageId,
      startMinutes: occ.slot.startMinutes,
      durationMin: occ.slot.durationMin,
    };
    const taken = new Set(occ.assignments.filter((a) => !a.withdrawn).map((a) => a.guideId));
    return Promise.all(
      guides
        .filter((g) => !taken.has(g.id))
        .map(async (g) => ({
          guideId: g.id,
          name: g.name ?? "",
          violations: checkAssignment(g, occ.id, slot, toIso(occ.date), await dayTours(prisma, occ.slot.tour.cityId, g.id, occ.date), settings),
        })),
    );
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
      return tx.assignment.update({
        where: { id },
        data: { withdrawn: body.withdrawn, withdrawnAt: body.withdrawn ? new Date() : null },
        select: { id: true, withdrawn: true },
      });
    });
  });

  app.delete("/assignments/:id", async (req) => {
    await requireAdmin(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await prisma.assignment.deleteMany({ where: { id } });
    return { ok: true };
  });
};
