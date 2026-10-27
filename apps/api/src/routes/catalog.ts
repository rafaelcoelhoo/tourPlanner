import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db";
import { requireAdmin, requireUser, resolveCity } from "../auth";
import { loadSettings } from "../context";
import { HttpError } from "../util";

const minutes = z.number().int().min(0).max(24 * 60 - 1);
const slotFields = z.object({
  tourId: z.string(),
  languageId: z.string(),
  startMinutes: minutes,
  durationMin: z.number().int().min(15).max(24 * 60),
  weekdays: z.array(z.number().int().min(1).max(7)),
  defaultNeeded: z.number().int().min(0).max(50),
  active: z.boolean(),
});
const slotCreate = slotFields.extend({
  durationMin: slotFields.shape.durationMin.default(150),
  weekdays: slotFields.shape.weekdays.default([]),
  defaultNeeded: slotFields.shape.defaultNeeded.default(1),
  active: slotFields.shape.active.default(true),
});
const slotPatch = slotFields.partial();

export const catalogRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/cities", async (req) => {
    await requireUser(req);
    return prisma.city.findMany({ orderBy: { name: "asc" } });
  });

  app.post("/cities", async (req) => {
    await requireAdmin(req);
    const body = z.object({ name: z.string().trim().min(1) }).parse(req.body);
    try {
      return await prisma.city.create({ data: body });
    } catch {
      throw new HttpError(409, "Já existe uma cidade com este nome.");
    }
  });

  app.get("/catalog", async (req) => {
    const u = await requireUser(req);
    const { cityId: q } = z.object({ cityId: z.string().optional() }).parse(req.query);
    const cityId = resolveCity(u, q);
    const [tours, languages, slots, settings] = await Promise.all([
      prisma.tour.findMany({ where: { cityId }, orderBy: [{ kind: "asc" }, { name: "asc" }] }),
      prisma.language.findMany({ orderBy: { name: "asc" } }),
      prisma.tourSlot.findMany({ where: { tour: { cityId } }, orderBy: [{ startMinutes: "asc" }] }),
      loadSettings(prisma),
    ]);
    return { cityId, tours, languages, slots, settings };
  });

  app.post("/tours", async (req) => {
    await requireAdmin(req);
    const body = z.object({ cityId: z.string(), name: z.string().trim().min(1), kind: z.enum(["PRIMARY", "SECONDARY"]).default("SECONDARY") }).parse(req.body);
    try {
      return await prisma.tour.create({ data: body });
    } catch {
      throw new HttpError(409, "Já existe um tour com este nome nesta cidade.");
    }
  });

  app.patch("/tours/:id", async (req) => {
    await requireAdmin(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ name: z.string().min(1).optional(), kind: z.enum(["PRIMARY", "SECONDARY"]).optional(), active: z.boolean().optional() }).parse(req.body);
    return prisma.tour.update({ where: { id }, data: body });
  });

  app.post("/slots", async (req) => {
    await requireAdmin(req);
    const body = slotCreate.parse(req.body);
    try {
      return await prisma.tourSlot.create({ data: body });
    } catch {
      throw new HttpError(409, "Já existe um slot com este tour, idioma e hora.");
    }
  });

  app.patch("/slots/:id", async (req) => {
    await requireAdmin(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = slotPatch.parse(req.body);
    try {
      return await prisma.tourSlot.update({ where: { id }, data: body });
    } catch {
      throw new HttpError(409, "Conflito ao guardar o slot (duplicado?).");
    }
  });

  app.put("/settings", async (req) => {
    await requireAdmin(req);
    const body = z
      .object({
        morningCutoffMinutes: minutes,
        minGapMinutes: z.number().int().min(0).max(600),
        maxToursPerDay: z.number().int().min(1).max(6),
        defaultDurationMin: z.number().int().min(15).max(24 * 60),
      })
      .parse(req.body);
    await prisma.settings.upsert({ where: { id: 1 }, update: body, create: { id: 1, ...body } });
    return loadSettings(prisma);
  });
};
