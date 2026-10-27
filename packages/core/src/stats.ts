import { availableDays } from "./availability";
import type { AssignmentInfo, GuideInfo, GuideStats, IsoDate, OccurrenceInfo, SlotInfo } from "./types";

/** Conta apenas atribuições não retiradas em ocorrências ATIVAS (NT liberta a carga). */
export const computeStats = (
  guides: GuideInfo[],
  slots: SlotInfo[],
  occurrences: OccurrenceInfo[],
  assignments: AssignmentInfo[],
  dates: IsoDate[],
): GuideStats[] => {
  const slotById = new Map(slots.map((s) => [s.id, s]));
  const occById = new Map(occurrences.map((o) => [o.id, o]));
  const counts = new Map<string, { primary: number; secondary: number }>();
  for (const g of guides) counts.set(g.id, { primary: 0, secondary: 0 });
  for (const a of assignments) {
    if (a.withdrawn) continue;
    const o = occById.get(a.occurrenceId);
    const s = o && slotById.get(o.slotId);
    const c = counts.get(a.guideId);
    if (!o || !s || !c || o.status !== "ACTIVE") continue;
    if (s.tourKind === "PRIMARY") c.primary++;
    else c.secondary++;
  }
  return guides.map((g) => {
    const c = counts.get(g.id) ?? { primary: 0, secondary: 0 };
    const avail = availableDays(g, dates);
    return {
      guideId: g.id,
      ...c,
      availableDays: avail,
      ratio: avail > 0 ? (c.primary + c.secondary) / avail : 0,
    };
  });
};
