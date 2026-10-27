import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  PORT: z.coerce.number().default(3000),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
  MAIL_TRANSPORT: z.enum(["console", "resend"]).default("console"),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  COOKIE_SAMESITE: z.enum(["lax", "none", "strict"]).default("lax"),
});

export const env = schema
  .refine((e) => e.MAIL_TRANSPORT !== "resend" || (e.RESEND_API_KEY && e.MAIL_FROM), "MAIL_TRANSPORT=resend requer RESEND_API_KEY e MAIL_FROM")
  .parse(process.env);
