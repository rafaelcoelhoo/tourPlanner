import {
  DEFAULT_SETTINGS,
  daysOfMonth,
  type AssignmentInfo,
  type GuideInfo,
  type OccurrenceInfo,
  type Settings,
  type SlotInfo,
  type Weekday,
} from "@schedule/core";
import { prisma, type Tx } from "./db";
import { fromIso, toIso } from "./util";

type Db = Tx | typeof prisma;

export const loadSettings = async (db: Db): Promise<Settings & { defaultDurationMin: number; confirmWindowHours: number }> => {
  const s = await db.settings.findUnique({ where: { id: 1 } });
  return {
    morningCutoffMinutes: s?.morningCutoffMinutes ?? DEFAULT_SETTINGS.morningCutoffMinutes,
    minGapMinutes: s?.minGapMinutes ?? DEFAULT_SETTINGS.minGapMinutes,
    maxToursPerDay: s?.maxToursPerDay ?? DEFAULT_SETTINGS.maxToursPerDay,
    defaultDurationMin: s?.defaultDurationMin ?? 150,
    confirmWindowHours: s?.confirmWindowHours ?? 3,
  };
};

export const loadSlots = async (db: Db, cityId: string): Promise<SlotInfo[]> => {
  const slots = await db.tourSlot.findMany({ where: { tour: { cityId } }, include: { tour: true } });
  return slots.map((s) => ({
    id: s.id,
    tourId: s.tourId,
    tourKind: s.tour.kind,
    languageId: s.languageId,
    startMinutes: s.startMinutes,
    durationMin: s.durationMin,
  }));
};

export const loadGuides = async (db: Db, cityId: string, onlyIds?: string[]): Promise<GuideInfo[]> => {
  const users = await db.user.findMany({
    where: { role: "GUIDE", status: "ACTIVE", cityId, ...(onlyIds ? { id: { in: onlyIds } } : {}) },
    include: { qualifications: true, unavailabilities: true, recurringRestrictions: true },
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    qualifications: u.qualifications.map((q) => ({ tourId: q.tourId, languageId: q.languageId })),
    unavailabilities: u.unavailabilities.map((x) => ({
      startDate: toIso(x.startDate),
      endDate: toIso(x.endDate),
      period: x.period,
      slotId: x.slotId,
      afterMinutes: x.afterMinutes,
      beforeMinutes: x.beforeMinutes,
    })),
    restrictions: u.recurringRestrictions.map((r) => ({
      weekday: r.weekday as Weekday,
      period: r.period,
      notBeforeMinutes: r.notBeforeMinutes,
      notAfterMinutes: r.notAfterMinutes,
    })),
  }));
};

export interface MonthData {
  monthId: string;
  dates: string[];
  occurrences: OccurrenceInfo[];
  assignments: (AssignmentInfo & { id: string; source: "GENERATED" | "MANUAL" })[];
}

export const loadMonth = async (db: Db, cityId: string, year: number, month: number): Promise<MonthData | null> => {
  const m = await db.monthSchedule.findUnique({
    where: { cityId_year_month: { cityId, year, month } },
    include: { occurrences: { include: { assignments: true } } },
  });
  if (!m) return null;
  return {
    monthId: m.id,
    dates: daysOfMonth(year, month),
    occurrences: m.occurrences.map((o) => ({
      id: o.id,
      slotId: o.slotId,
      date: toIso(o.date),
      status: o.status,
      needed: o.needed,
    })),
    assignments: m.occurrences.flatMap((o) =>
      o.assignments.map((a) => ({
        id: a.id,
        occurrenceId: a.occurrenceId,
        guideId: a.guideId,
        withdrawn: a.withdrawn,
        source: a.source,
      })),
    ),
  };
};

export const monthRange = (year: number, month: number) => ({
  gte: fromIso(`${year}-${String(month).padStart(2, "0")}-01`),
  lt: new Date(Date.UTC(year, month, 1)),
});
