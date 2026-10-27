import type { Catalog, Slot } from "./types";

export const fmtTime = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const parseTime = (s: string): number => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));

export const weekdayIdx = (iso: string): number => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
export const daysInMonth = (y: number, m: number): string[] =>
  Array.from({ length: new Date(Date.UTC(y, m, 0)).getUTCDate() }, (_, i) => `${y}-${String(m).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`);
export const addDays = (iso: string, n: number): string => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export const today = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const currentYm = (): { year: number; month: number } => {
  const [y, m] = today().split("-").map(Number) as [number, number];
  return { year: y, month: m };
};

export const slotLabel = (s: Slot, c: Catalog): string => {
  const t = c.tours.find((x) => x.id === s.tourId)?.name ?? "?";
  const l = c.languages.find((x) => x.id === s.languageId)?.code ?? "?";
  return `${fmtTime(s.startMinutes)} ${t} ${l}`;
};

export const sortSlots = (slots: Slot[], c: Catalog): Slot[] =>
  [...slots].sort((a, b) => a.startMinutes - b.startMinutes || slotLabel(a, c).localeCompare(slotLabel(b, c)));

export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : "Error");
