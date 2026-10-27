import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "../db";
import { createSession, destroySession, requireUser } from "../auth";
import { HttpError, sha256 } from "../util";

const password = z.string().min(8, "A palavra-passe deve ter pelo menos 8 caracteres.").max(200);

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/auth/login", async (req, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    const ok = user?.passwordHash && user.status === "ACTIVE" && (await argon2.verify(user.passwordHash, body.password));
    if (!user || !ok) throw new HttpError(401, "Email ou palavra-passe incorretos.");
    await createSession(user.id, reply);
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  });

  app.post("/auth/logout", async (req, reply) => {
    await destroySession(req, reply);
    return { ok: true };
  });

  app.get("/auth/me", async (req) => {
    const u = await requireUser(req);
    return u;
  });

  app.get("/auth/invite/:token", async (req) => {
    const { token } = z.object({ token: z.string() }).parse(req.params);
    const inv = await prisma.invite.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
    if (!inv || inv.usedAt || inv.expiresAt < new Date()) throw new HttpError(404, "Convite inválido ou expirado.");
    return { name: inv.user.name, email: inv.user.email };
  });

  app.post("/auth/activate", async (req, reply) => {
    const body = z.object({ token: z.string(), password }).parse(req.body);
    const inv = await prisma.invite.findUnique({ where: { tokenHash: sha256(body.token) } });
    if (!inv || inv.usedAt || inv.expiresAt < new Date()) throw new HttpError(404, "Convite inválido ou expirado.");
    const passwordHash = await argon2.hash(body.password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: inv.userId }, data: { passwordHash, status: "ACTIVE" } }),
      prisma.invite.update({ where: { id: inv.id }, data: { usedAt: new Date() } }),
    ]);
    await createSession(inv.userId, reply);
    return { ok: true };
  });

  app.post("/auth/password", async (req) => {
    const u = await requireUser(req);
    const body = z.object({ current: z.string(), next: password }).parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    if (!user.passwordHash || !(await argon2.verify(user.passwordHash, body.current)))
      throw new HttpError(400, "Palavra-passe atual incorreta.");
    await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await argon2.hash(body.next) } });
    return { ok: true };
  });
};
