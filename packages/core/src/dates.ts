import type { IsoDate, Weekday } from "./types";

const toUtc = (d: IsoDate): number => {
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, day);
};

export const weekdayOf = (d: IsoDate): Weekday => {
  const w = new Date(toUtc(d)).getUTCDay();
  return (w === 0 ? 7 : w) as Weekday;
};

export const daysOfMonth = (year: number, month: number): IsoDate[] => {
  const n = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return Array.from({ length: n }, (_, i) => `${year}-${mm}-${String(i + 1).padStart(2, "0")}`);
};

export const inRange = (d: IsoDate, start: IsoDate, end: IsoDate): boolean => d >= start && d <= end;

export const DEFAULT_TIMEZONE = "Europe/Lisbon";

const offsetMinutes = (utcMs: number, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string): number => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - Math.floor(utcMs / 1000) * 1000) / 60000;
};

/** Instante UTC correspondente a `date` + `minutes` desde as 00:00 no fuso indicado (respeita o horário de verão). */
export const zonedInstant = (date: IsoDate, minutes: number, timeZone: string = DEFAULT_TIMEZONE): Date => {
  const naive = toUtc(date) + minutes * 60000;
  const first = naive - offsetMinutes(naive, timeZone) * 60000;
  return new Date(naive - offsetMinutes(first, timeZone) * 60000);
};

export type ConfirmState = "NOT_YET" | "OPEN" | "ENDED";

export interface ConfirmWindow {
  state: ConfirmState;
  opensAt: Date;
  startAt: Date;
  endsAt: Date;
}

/** Janela em que o guia pode confirmar: de `windowHours` antes do início até ao fim do tour. */
export const confirmWindow = (
  now: Date,
  date: IsoDate,
  startMinutes: number,
  durationMin: number,
  windowHours: number,
  timeZone: string = DEFAULT_TIMEZONE,
): ConfirmWindow => {
  const startAt = zonedInstant(date, startMinutes, timeZone);
  const opensAt = new Date(startAt.getTime() - windowHours * 3_600_000);
  const endsAt = new Date(startAt.getTime() + durationMin * 60_000);
  const state: ConfirmState = now < opensAt ? "NOT_YET" : now > endsAt ? "ENDED" : "OPEN";
  return { state, opensAt, startAt, endsAt };
};
