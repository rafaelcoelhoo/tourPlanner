import { blockReason, isQualified, periodOf } from "./availability";
import type { GuideInfo, IsoDate, Settings, SlotInfo, Violation } from "./types";

export interface DayTour {
  occurrenceId: string;
  slot: SlotInfo;
}

/**
 * Verifica se atribuir `guide` a `slot` em `date` viola regras, dado o que o guia já tem nesse dia
 * (apenas atribuições ativas em ocorrências ATIVAS; exclui a própria ocorrência).
 */
export const checkAssignment = (
  guide: GuideInfo,
  occurrenceId: string,
  slot: SlotInfo,
  date: IsoDate,
  sameDay: DayTour[],
  settings: Settings,
): Violation[] => {
  const out: Violation[] = [];
  if (!isQualified(guide, slot))
    out.push({ code: "NOT_QUALIFIED", message: "Guia sem qualificação para este tour e idioma." });
  const block = blockReason(guide, slot, date, settings.morningCutoffMinutes);
  if (block === "UNAVAILABLE") out.push({ code: "UNAVAILABLE", message: "Guia indisponível." });
  if (block === "RESTRICTION") out.push({ code: "RESTRICTION", message: "Viola uma restrição recorrente do guia." });

  const others = sameDay.filter((t) => t.occurrenceId !== occurrenceId);
  if (sameDay.some((t) => t.occurrenceId === occurrenceId))
    out.push({ code: "DUPLICATE", message: "Guia já atribuído a esta ocorrência." });
  if (others.length >= settings.maxToursPerDay)
    out.push({ code: "MAX_PER_DAY", message: `Máximo de ${settings.maxToursPerDay} tours por dia.` });

  const period = periodOf(slot.startMinutes, settings.morningCutoffMinutes);
  if (others.some((t) => periodOf(t.slot.startMinutes, settings.morningCutoffMinutes) === period))
    out.push({ code: "SAME_PERIOD", message: "Já tem um tour no mesmo período do dia." });

  const start = slot.startMinutes;
  const end = start + slot.durationMin;
  for (const t of others) {
    const s = t.slot.startMinutes;
    const e = s + t.slot.durationMin;
    const gap = start >= s ? start - e : s - end;
    if (gap < settings.minGapMinutes) {
      out.push({ code: "MIN_GAP", message: `Intervalo inferior a ${settings.minGapMinutes} min entre tours.` });
      break;
    }
  }
  return out;
};
