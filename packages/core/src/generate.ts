import { availableDays } from "./availability";
import { checkAssignment, type DayTour } from "./rules";
import { computeStats } from "./stats";
import type {
  AssignmentInfo,
  GuideInfo,
  GuideStats,
  IncompleteOccurrence,
  IsoDate,
  OccurrenceInfo,
  Settings,
  SlotInfo,
} from "./types";

export interface GenerateInput {
  slots: SlotInfo[];
  occurrences: OccurrenceInfo[];
  guides: GuideInfo[];
  dates: IsoDate[];
  settings: Settings;
  /** Atribuições a preservar (ex.: manuais). */
  locked?: AssignmentInfo[];
}

export interface GenerateOutput {
  assignments: AssignmentInfo[];
  incomplete: IncompleteOccurrence[];
  stats: GuideStats[];
}

/**
 * Guloso dia a dia: em cada passo escolhe a ocorrência com menos candidatos elegíveis e atribui
 * o candidato com menor rácio (tours do mesmo tipo / dias disponíveis). Sem backtracking.
 */
export const generateSchedule = (input: GenerateInput): GenerateOutput => {
  const { slots, occurrences, guides, dates, settings } = input;
  const slotById = new Map(slots.map((s) => [s.id, s]));
  const weight = new Map(guides.map((g) => [g.id, availableDays(g, dates)]));
  const counts = new Map(guides.map((g) => [g.id, { primary: 0, secondary: 0 }]));
  const active = occurrences.filter((o) => o.status === "ACTIVE" && slotById.has(o.slotId));
  const activeIds = new Set(active.map((o) => o.id));
  const occById = new Map(active.map((o) => [o.id, o]));

  const dayTours = new Map<string, DayTour[]>();
  const key = (g: string, d: IsoDate) => `${g}|${d}`;
  const assigned = new Map<string, Set<string>>();
  const out: AssignmentInfo[] = [];

  const record = (guideId: string, o: OccurrenceInfo, s: SlotInfo) => {
    const k = key(guideId, o.date);
    dayTours.set(k, [...(dayTours.get(k) ?? []), { occurrenceId: o.id, slot: s }]);
    const set = assigned.get(o.id) ?? new Set<string>();
    set.add(guideId);
    assigned.set(o.id, set);
    const c = counts.get(guideId);
    if (c) c[s.tourKind === "PRIMARY" ? "primary" : "secondary"]++;
  };

  for (const a of input.locked ?? []) {
    const o = occById.get(a.occurrenceId);
    const s = o && slotById.get(o.slotId);
    if (a.withdrawn || !o || !s || !activeIds.has(o.id)) continue;
    record(a.guideId, o, s);
  }

  const candidates = (o: OccurrenceInfo, s: SlotInfo): GuideInfo[] =>
    guides.filter(
      (g) =>
        (weight.get(g.id) ?? 0) > 0 &&
        checkAssignment(g, o.id, s, o.date, dayTours.get(key(g.id, o.date)) ?? [], settings).length === 0,
    );

  const rank = (g: GuideInfo, s: SlotInfo): [number, number, string] => {
    const w = weight.get(g.id) || 1;
    const c = counts.get(g.id) ?? { primary: 0, secondary: 0 };
    const own = s.tourKind === "PRIMARY" ? c.primary : c.secondary;
    return [own / w, (c.primary + c.secondary) / w, g.id];
  };

  const incomplete: IncompleteOccurrence[] = [];
  for (const date of dates) {
    const pending = active
      .filter((o) => o.date === date && o.needed > (assigned.get(o.id)?.size ?? 0))
      .map((o) => ({ o, s: slotById.get(o.slotId) as SlotInfo }));
    while (pending.length > 0) {
      let best = -1;
      let bestCands: GuideInfo[] = [];
      pending.forEach((p, i) => {
        const cands = candidates(p.o, p.s);
        const cur = best >= 0 ? pending[best] : undefined;
        if (
          !cur ||
          cands.length < bestCands.length ||
          (cands.length === bestCands.length &&
            (p.s.startMinutes < cur.s.startMinutes ||
              (p.s.startMinutes === cur.s.startMinutes && p.o.id < cur.o.id)))
        ) {
          best = i;
          bestCands = cands;
        }
      });
      const { o, s } = pending[best] as { o: OccurrenceInfo; s: SlotInfo };
      const have = assigned.get(o.id)?.size ?? 0;
      const pick = [...bestCands].sort((a, b) => {
        const ra = rank(a, s);
        const rb = rank(b, s);
        return ra[0] - rb[0] || ra[1] - rb[1] || (ra[2] < rb[2] ? -1 : 1);
      })[0];
      if (!pick) {
        if (o.needed - have > 0) incomplete.push({ occurrenceId: o.id, missing: o.needed - have });
        pending.splice(best, 1);
        continue;
      }
      record(pick.id, o, s);
      out.push({ occurrenceId: o.id, guideId: pick.id });
      if (have + 1 >= o.needed) pending.splice(best, 1);
    }
  }

  const all = [...(input.locked ?? []).filter((a) => !a.withdrawn), ...out];
  return { assignments: out, incomplete, stats: computeStats(guides, slots, occurrences, all, dates) };
};
