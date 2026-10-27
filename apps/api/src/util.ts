import { createHash, randomBytes } from "node:crypto";

export const toIso = (d: Date): string => d.toISOString().slice(0, 10);
export const fromIso = (s: string): Date => new Date(`${s}T00:00:00.000Z`);
export const todayLisbon = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");
export const newToken = (): string => randomBytes(32).toString("hex");

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
