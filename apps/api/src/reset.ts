import { prisma } from "./db";
import { env } from "./env";
import { newToken, sha256 } from "./util";

export const RESET_TTL_MS = 60 * 60 * 1000;

/** Cria um token de redefinição de uso único (1 hora) e invalida os anteriores ainda por usar. */
export const issueReset = async (userId: string): Promise<string> => {
  const token = newToken();
  await prisma.$transaction([
    prisma.passwordReset.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordReset.create({ data: { userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) } }),
  ]);
  return `${env.WEB_ORIGIN}/redefinir/${token}`;
};
