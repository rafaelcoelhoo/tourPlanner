import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { env } from "./env";
import { loadUser } from "./auth";
import { HttpError } from "./util";
import { isKnownMessage, parseLang, translate } from "./i18n";
import { authRoutes } from "./routes/auth";
import { catalogRoutes } from "./routes/catalog";
import { guideRoutes } from "./routes/guides";
import { monthRoutes } from "./routes/months";
import { assignmentRoutes } from "./routes/assignments";

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({ logger: true, trustProxy: true });
  await app.register(cors, { origin: env.WEB_ORIGIN, credentials: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] });
  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  app.addHook("preHandler", loadUser);

  app.setErrorHandler((err, req, reply) => {
    const lang = parseLang(req.headers["x-lang"]);
    if ((err as { statusCode?: number }).statusCode === 429) return reply.status(429).send({ error: translate("Demasiadas tentativas. Tente novamente mais tarde.", lang) });
    if (err instanceof ZodError) {
      const first = err.issues[0]?.message ?? "";
      return reply.status(400).send({ error: translate(isKnownMessage(first) ? first : "Dados inválidos.", lang), issues: err.issues });
    }
    if (err instanceof HttpError) return reply.status(err.statusCode).send({ error: translate(err.message, lang), details: err.details });
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") return reply.status(404).send({ error: translate("Não encontrado.", lang) });
    app.log.error(err);
    return reply.status(500).send({ error: translate("Erro interno.", lang) });
  });

  app.get("/health", async () => ({ ok: true }));
  await app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(catalogRoutes);
      await api.register(guideRoutes);
      await api.register(monthRoutes);
      await api.register(assignmentRoutes);
    },
    { prefix: "/api" },
  );
  return app;
};
