import { inRange, weekdayOf } from "./dates";
import type { GuideInfo, IsoDate, Period, SlotInfo } from "./types";

export const periodOf = (startMinutes: number, cutoff: number): "MORNING" | "AFTERNOON" =>
  startMinutes < cutoff ? "MORNING" : "AFTERNOON";

const covers = (p: Period, target: "MORNING" | "AFTERNOON"): boolean => p === "FULL_DAY" || p === target;

export type BlockReason = "UNAVAILABLE" | "RESTRICTION";

export const blockReason = (
  guide: GuideInfo,
  slot: SlotInfo,
  date: IsoDate,
  cutoff: number,
): BlockReason | null => {
  const period = periodOf(slot.startMinutes, cutoff);
  for (const u of guide.unavailabilities) {
    if (!inRange(date, u.startDate, u.endDate)) continue;
    if (u.slotId ? u.slotId === slot.id : covers(u.period, period)) return "UNAVAILABLE";
  }
  const wd = weekdayOf(date);
  for (const r of guide.restrictions) {
    if (r.weekday !== wd || !covers(r.period, period)) continue;
    const hasLimit = r.notBeforeMinutes != null || r.notAfterMinutes != null;
    if (!hasLimit) return "RESTRICTION";
    if (r.notBeforeMinutes != null && slot.startMinutes < r.notBeforeMinutes) return "RESTRICTION";
    if (r.notAfterMinutes != null && slot.startMinutes > r.notAfterMinutes) return "RESTRICTION";
  }
  return null;
};

const periodFree = (guide: GuideInfo, date: IsoDate, target: "MORNING" | "AFTERNOON"): boolean => {
  const wd = weekdayOf(date);
  for (const u of guide.unavailabilities) {
    if (!u.slotId && inRange(date, u.startDate, u.endDate) && covers(u.period, target)) return false;
  }
  for (const r of guide.restrictions) {
    const hasLimit = r.notBeforeMinutes != null || r.notAfterMinutes != null;
    if (!hasLimit && r.weekday === wd && covers(r.period, target)) return false;
  }
  return true;
};

/** Peso de disponibilidade do dia: 1 = livre, 0.5 = um período bloqueado, 0 = bloqueado. */
export const dayWeight = (guide: GuideInfo, date: IsoDate): number =>
  ((periodFree(guide, date, "MORNING") ? 1 : 0) + (periodFree(guide, date, "AFTERNOON") ? 1 : 0)) / 2;

export const availableDays = (guide: GuideInfo, dates: IsoDate[]): number =>
  dates.reduce((s, d) => s + dayWeight(guide, d), 0);

export const isQualified = (guide: GuideInfo, slot: SlotInfo): boolean =>
  guide.qualifications.some((q) => q.tourId === slot.tourId && q.languageId === slot.languageId);
