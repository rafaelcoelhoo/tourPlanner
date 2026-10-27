import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  PORT: z.coerce.number().default(3000),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
  COOKIE_SAMESITE: z.enum(["lax", "none", "strict"]).default("lax"),
});

export const env = schema.parse(process.env);
