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
