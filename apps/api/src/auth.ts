import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "@prisma/client";
import { env } from "./env";
import { prisma } from "./db";
import { HttpError, newToken, sha256 } from "./util";

export const COOKIE = "sid";
const SESSION_DAYS = 30;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  cityId: string | null;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export const createSession = async (userId: string, reply: FastifyReply): Promise<void> => {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.session.create({ data: { id: sha256(token), userId, expiresAt } });
  reply.setCookie(COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: env.COOKIE_SAMESITE,
    secure: env.COOKIE_SECURE === "true",
    expires: expiresAt,
  });
};

export const destroySession = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const token = req.cookies[COOKIE];
  if (token) await prisma.session.deleteMany({ where: { id: sha256(token) } });
  reply.clearCookie(COOKIE, { path: "/" });
};

export const loadUser = async (req: FastifyRequest): Promise<void> => {
  const token = req.cookies[COOKIE];
  if (!token) return;
  const s = await prisma.session.findUnique({ where: { id: sha256(token) }, include: { user: true } });
  if (!s || s.expiresAt < new Date() || s.user.status !== "ACTIVE") return;
  req.user = { id: s.user.id, email: s.user.email, name: s.user.name, role: s.user.role, cityId: s.user.cityId };
};

export const requireUser = async (req: FastifyRequest): Promise<AuthUser> => {
  if (!req.user) throw new HttpError(401, "Sessão inválida.");
  return req.user;
};

export const requireAdmin = async (req: FastifyRequest): Promise<AuthUser> => {
  const u = await requireUser(req);
  if (u.role !== "ADMIN") throw new HttpError(403, "Apenas o administrador.");
  return u;
};

export const requireSelfOrAdmin = async (req: FastifyRequest, guideId: string): Promise<AuthUser> => {
  const u = await requireUser(req);
  if (u.role !== "ADMIN" && u.id !== guideId) throw new HttpError(403, "Sem permissão.");
  return u;
};

/** Cidade efetiva: o admin escolhe; o guia fica sempre limitado à sua cidade. */
export const resolveCity = (u: AuthUser, requested?: string | null): string => {
  if (u.role === "GUIDE") {
    if (!u.cityId) throw new HttpError(400, "Selecione a sua cidade no perfil.");
    if (requested && requested !== u.cityId) throw new HttpError(403, "Sem acesso a esta cidade.");
    return u.cityId;
  }
  if (!requested) throw new HttpError(400, "Cidade em falta.");
  return requested;
};
