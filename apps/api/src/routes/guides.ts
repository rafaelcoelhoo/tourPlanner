import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db";
import { requireAdmin, requireSelfOrAdmin } from "../auth";
import { env } from "../env";
import { issueReset } from "../reset";
import { HttpError, fromIso, newToken, sha256, toIso, todayLisbon } from "../util";

const monthsBetween = (startIso: string, endIso: string): { year: number; month: number }[] => {
  const [sy, sm] = startIso.split("-").map(Number) as [number, number];
  const [ey, em] = endIso.split("-").map(Number) as [number, number];
  const out: { year: number; month: number }[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push({ year: y, month: m });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
};

const assertNotPublishedForGuide = async (role: "ADMIN" | "GUIDE", guideId: string, startIso: string, endIso: string): Promise<void> => {
  if (role === "ADMIN") return;
  const user = await prisma.user.findUnique({ where: { id: guideId }, select: { cityId: true } });
  if (!user?.cityId) return;
  const yms = monthsBetween(startIso, endIso);
  const pub = await prisma.monthSchedule.findFirst({
    where: { cityId: user.cityId, status: "PUBLISHED", OR: yms },
    select: { id: true },
  });
  if (pub) throw new HttpError(409, "O horário deste mês já foi publicado. Contacte o administrador para alterar disponibilidades.");
};

const idParam = z.object({ id: z.string() });
const period = z.enum(["MORNING", "AFTERNOON", "FULL_DAY"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const minutes = z.number().int().min(0).max(24 * 60 - 1);

const issueInvite = async (userId: string): Promise<string> => {
  const token = newToken();
  const data = { tokenHash: sha256(token), expiresAt: new Date(Date.now() + 7 * 86_400_000), usedAt: null };
  await prisma.invite.upsert({ where: { userId }, update: data, create: { userId, ...data } });
  return `${env.WEB_ORIGIN}/ativar/${token}`;
};

export const guideRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/guides", async (req) => {
    await requireAdmin(req);
    const { cityId } = z.object({ cityId: z.string() }).parse(req.query);
    const users = await prisma.user.findMany({
      where: { role: "GUIDE", cityId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, phone: true, status: true, qualifications: { select: { tourId: true, languageId: true, tour: { select: { kind: true } } } } },
    });
    return users.map(({ qualifications, ...u }) => ({
      ...u,
      qualifications: qualifications.map((q) => ({ tourId: q.tourId, languageId: q.languageId })),
      qualificationCount: qualifications.length,
      secondaryCount: qualifications.filter((q) => q.tour.kind === "SECONDARY").length,
    }));
  });

  app.post("/guides", async (req) => {
    await requireAdmin(req);
    const body = z.object({ cityId: z.string(), name: z.string().min(1), email: z.string().email(), phone: z.string().optional() }).parse(req.body);
    if (!(await prisma.city.findUnique({ where: { id: body.cityId } }))) throw new HttpError(404, "Cidade não encontrada.");
    const email = body.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) throw new HttpError(409, "Já existe um utilizador com este email.");
    const user = await prisma.user.create({ data: { ...body, email, role: "GUIDE" } });
    return { id: user.id, inviteLink: await issueInvite(user.id) };
  });

  app.post("/guides/:id/invite", async (req) => {
    await requireAdmin(req);
    const { id } = idParam.parse(req.params);
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "GUIDE") throw new HttpError(404, "Guia não encontrado.");
    return { inviteLink: await issueInvite(id) };
  });

  app.post("/guides/:id/reset-link", async (req) => {
    await requireAdmin(req);
    const { id } = idParam.parse(req.params);
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "GUIDE") throw new HttpError(404, "Guia não encontrado.");
    if (u.status === "INVITED") throw new HttpError(400, "O guia ainda não ativou a conta.");
    return { resetLink: await issueReset(id) };
  });

  app.patch("/guides/:id", async (req) => {
    await requireAdmin(req);
    const { id } = idParam.parse(req.params);
    const body = z
      .object({ name: z.string().min(1).optional(), phone: z.string().nullable().optional(), status: z.enum(["ACTIVE", "DISABLED"]).optional() })
      .parse(req.body);
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "GUIDE") throw new HttpError(404, "Guia não encontrado.");
    if (body.status === "ACTIVE" && !u.passwordHash) throw new HttpError(400, "O guia ainda não ativou a conta.");
    return prisma.$transaction(async (tx) => {
      if (body.status === "DISABLED") {
        await tx.session.deleteMany({ where: { userId: id } });
        await tx.assignment.deleteMany({
          where: { guideId: id, withdrawn: false, occurrence: { date: { gte: fromIso(todayLisbon()) } } },
        });
      }
      return tx.user.update({ where: { id }, data: body, select: { id: true, name: true, status: true } });
    });
  });

  app.get("/guides/:id/profile", async (req) => {
    const { id } = idParam.parse(req.params);
    await requireSelfOrAdmin(req, id);
    const u = await prisma.user.findUnique({
      where: { id },
      include: { qualifications: true, unavailabilities: { orderBy: { startDate: "asc" } }, recurringRestrictions: true },
    });
    if (!u) throw new HttpError(404, "Guia não encontrado.");
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      cityId: u.cityId,
      qualifications: u.qualifications.map((q) => ({ tourId: q.tourId, languageId: q.languageId })),
      unavailabilities: u.unavailabilities.map((x) => ({
        id: x.id,
        startDate: toIso(x.startDate),
        endDate: toIso(x.endDate),
        period: x.period,
        slotId: x.slotId,
        note: x.note,
      })),
      restrictions: u.recurringRestrictions,
    };
  });

  app.put("/guides/:id/city", async (req) => {
    const { id } = idParam.parse(req.params);
    await requireAdmin(req);
    const { cityId } = z.object({ cityId: z.string() }).parse(req.body);
    if (!(await prisma.city.findUnique({ where: { id: cityId } }))) throw new HttpError(404, "Cidade não encontrada.");
    await prisma.$transaction([
      prisma.guideQualification.deleteMany({ where: { userId: id } }),
      prisma.unavailability.deleteMany({ where: { userId: id, slotId: { not: null } } }),
      prisma.assignment.deleteMany({
        where: { guideId: id, withdrawn: false, occurrence: { date: { gte: fromIso(todayLisbon()) } } },
      }),
      prisma.user.update({ where: { id }, data: { cityId } }),
    ]);
    return { ok: true };
  });

  app.put("/guides/:id/qualifications", async (req) => {
    const { id } = idParam.parse(req.params);
    await requireSelfOrAdmin(req, id);
    const body = z.object({ qualifications: z.array(z.object({ tourId: z.string(), languageId: z.string() })) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user?.cityId) throw new HttpError(400, "O guia ainda não tem cidade.");
    const valid = await prisma.tour.findMany({ where: { cityId: user.cityId, id: { in: body.qualifications.map((q) => q.tourId) } }, select: { id: true } });
    if (valid.length !== new Set(body.qualifications.map((q) => q.tourId)).size) throw new HttpError(400, "Tour de outra cidade.");
    await prisma.$transaction([
      prisma.guideQualification.deleteMany({ where: { userId: id } }),
      prisma.guideQualification.createMany({ data: body.qualifications.map((q) => ({ ...q, userId: id })), skipDuplicates: true }),
    ]);
    return { ok: true };
  });

  app.post("/guides/:id/unavailabilities", async (req) => {
    const { id } = idParam.parse(req.params);
    const u = await requireSelfOrAdmin(req, id);
    const body = z
      .object({ startDate: isoDate, endDate: isoDate, period: period.default("FULL_DAY"), slotId: z.string().nullish(), note: z.string().max(200).nullish() })
      .refine((b) => b.endDate >= b.startDate, "A data final não pode ser anterior à inicial.")
      .parse(req.body);
    await assertNotPublishedForGuide(u.role, id, body.startDate, body.endDate);
    if (body.slotId) {
      const slot = await prisma.tourSlot.findUnique({ where: { id: body.slotId }, include: { tour: true } });
      const user = await prisma.user.findUnique({ where: { id } });
      if (!slot || slot.tour.cityId !== user?.cityId) throw new HttpError(400, "Slot de outra cidade.");
    }
    const x = await prisma.unavailability.create({
      data: { userId: id, ...body, startDate: fromIso(body.startDate), endDate: fromIso(body.endDate) },
    });
    return { id: x.id };
  });

  app.delete("/guides/:id/unavailabilities/:itemId", async (req) => {
    const { id, itemId } = z.object({ id: z.string(), itemId: z.string() }).parse(req.params);
    const u = await requireSelfOrAdmin(req, id);
    const existing = await prisma.unavailability.findFirst({ where: { id: itemId, userId: id } });
    if (existing) await assertNotPublishedForGuide(u.role, id, toIso(existing.startDate), toIso(existing.endDate));
    await prisma.unavailability.deleteMany({ where: { id: itemId, userId: id } });
    return { ok: true };
  });

  app.post("/guides/:id/restrictions", async (req) => {
    const { id } = idParam.parse(req.params);
    await requireSelfOrAdmin(req, id);
    const body = z
      .object({
        weekday: z.number().int().min(1).max(7),
        period: period.default("FULL_DAY"),
        notBeforeMinutes: minutes.nullish(),
        notAfterMinutes: minutes.nullish(),
      })
      .parse(req.body);
    const r = await prisma.recurringRestriction.create({ data: { userId: id, ...body } });
    return { id: r.id };
  });

  app.delete("/guides/:id/restrictions/:itemId", async (req) => {
    const { id, itemId } = z.object({ id: z.string(), itemId: z.string() }).parse(req.params);
    await requireSelfOrAdmin(req, id);
    await prisma.recurringRestriction.deleteMany({ where: { id: itemId, userId: id } });
    return { ok: true };
  });
};
