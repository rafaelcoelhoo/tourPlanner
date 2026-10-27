import { checkAssignment, type DayTour, type SlotInfo, type Violation } from "@schedule/core";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { loadGuides, loadSettings, loadSlots } from "./context";
import { toIso } from "./util";

export type OccRow = Prisma.SlotOccurrenceGetPayload<{ include: { assignments: { include: { guide: { select: { id: true; name: true } } } } } }>;
export const occInclude = { assignments: { include: { guide: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } } } satisfies Prisma.SlotOccurrenceInclude;

export interface AssignmentView {
  id: string;
  guideId: string;
  guideName: string;
  withdrawn: boolean;
  source: "GENERATED" | "MANUAL";
  warnings: Violation[];
}

export interface OccurrenceView {
  id: string;
  slotId: string;
  date: string;
  status: "ACTIVE" | "NO_DEMAND";
  needed: number;
  note: string | null;
  missing: number;
  assignments: AssignmentView[];
}

/** Calcula avisos (violações) por atribuição, no contexto do mesmo dia. */
export const buildViews = async (cityId: string, rows: OccRow[]): Promise<OccurrenceView[]> => {
  const [guides, slots, settings] = await Promise.all([loadGuides(prisma, cityId), loadSlots(prisma, cityId), loadSettings(prisma)]);
  const guideById = new Map(guides.map((g) => [g.id, g]));
  const slotById = new Map<string, SlotInfo>(slots.map((s) => [s.id, s]));
  const byGuideDay = new Map<string, DayTour[]>();
  for (const o of rows) {
    const slot = slotById.get(o.slotId);
    if (!slot || o.status !== "ACTIVE") continue;
    for (const a of o.assignments) {
      if (a.withdrawn) continue;
      const k = `${a.guideId}|${toIso(o.date)}`;
      byGuideDay.set(k, [...(byGuideDay.get(k) ?? []), { occurrenceId: o.id, slot }]);
    }
  }
  return rows.map((o) => {
    const slot = slotById.get(o.slotId);
    const date = toIso(o.date);
    const active = o.status === "ACTIVE" ? o.assignments.filter((a) => !a.withdrawn).length : 0;
    return {
      id: o.id,
      slotId: o.slotId,
      date,
      status: o.status,
      needed: o.needed,
      note: o.note,
      missing: o.status === "ACTIVE" ? Math.max(0, o.needed - active) : 0,
      assignments: o.assignments.map((a) => {
        const g = guideById.get(a.guideId);
        const counts = !a.withdrawn && o.status === "ACTIVE";
        const same = (byGuideDay.get(`${a.guideId}|${date}`) ?? []).filter((t) => t.occurrenceId !== o.id);
        return {
          id: a.id,
          guideId: a.guideId,
          guideName: a.guide.name,
          withdrawn: a.withdrawn,
          source: a.source,
          warnings: counts && g && slot ? checkAssignment(g, o.id, slot, date, same, settings) : [],
        };
      }),
    };
  });
};
