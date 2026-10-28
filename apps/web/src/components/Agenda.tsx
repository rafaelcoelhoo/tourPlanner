import { useMemo } from "react";
import { slotLabel, weekdayIdx } from "../format";
import { useI18n } from "../i18n";
import type { Catalog, OccurrenceView } from "../types";

interface Props {
  dates: string[];
  occurrences: OccurrenceView[];
  catalog: Catalog;
  selected: string;
  today: string;
  onSelect: (date: string) => void;
  onOpen: (id: string) => void;
}

export const Agenda = ({ dates, occurrences, catalog, selected, today, onSelect, onOpen }: Props) => {
  const { t, weekdayShort } = useI18n();
  const slotById = useMemo(() => new Map(catalog.slots.map((s) => [s.id, s])), [catalog]);

  const flags = useMemo(() => {
    const map = new Map<string, { count: number; incomplete: boolean; warn: boolean }>();
    for (const o of occurrences) {
      if (o.needed <= 0) continue;
      const f = map.get(o.date) ?? { count: 0, incomplete: false, warn: false };
      f.count++;
      if (o.status === "ACTIVE" && o.missing > 0) f.incomplete = true;
      if (o.assignments.some((a) => !a.withdrawn && a.warnings.length > 0)) f.warn = true;
      map.set(o.date, f);
    }
    return map;
  }, [occurrences]);

  const dayOccs = useMemo(
    () =>
      occurrences
        .filter((o) => o.date === selected && o.needed > 0)
        .sort((a, b) => (slotById.get(a.slotId)?.startMinutes ?? 0) - (slotById.get(b.slotId)?.startMinutes ?? 0)),
    [occurrences, selected, slotById],
  );

  return (
    <div>
      <div className="daystrip" role="tablist">
        {dates.map((d) => {
          const f = flags.get(d);
          return (
            <button
              key={d}
              role="tab"
              aria-selected={d === selected}
              className={`daybtn ${d === selected ? "on" : ""} ${d === today ? "today" : ""} ${f ? "" : "empty"}`}
              onClick={() => onSelect(d)}
              ref={(el) => {
                if (el && d === selected) el.scrollIntoView({ inline: "center", block: "nearest" });
              }}
            >
              <small>{weekdayShort(weekdayIdx(d))}</small>
              <strong>{d.slice(8)}</strong>
              {f?.incomplete ? <span className="dot red" /> : f?.warn ? <span className="dot amber" /> : null}
            </button>
          );
        })}
      </div>
      {dayOccs.length === 0 && <p className="muted">{t("day.empty")}</p>}
      {dayOccs.map((o) => {
        const slot = slotById.get(o.slotId);
        const label = slot ? slotLabel(slot, catalog) : "?";
        const [time = "", ...rest] = label.split(" ");
        const warn = o.assignments.some((a) => !a.withdrawn && a.warnings.length > 0);
        const cls = o.status === "NO_DEMAND" ? "nt" : o.adminConfirmed ? "ac" : o.missing > 0 ? "incomplete" : "complete";
        return (
          <button key={o.id} className={`agenda-card ${cls} ${warn ? "warnc" : ""}`} onClick={() => onOpen(o.id)}>
            <div className="agenda-head">
              <span>
                <span className="agenda-time">{time}</span>
                {rest.join(" ")}
              </span>
              <span className={`badge ${o.status === "NO_DEMAND" ? "" : o.missing > 0 ? "draft" : "published"}`}>
                {o.status === "NO_DEMAND" ? t("occ.nt") : o.missing > 0 ? t("occ.missing", { n: o.missing }) : t("occ.complete")}
              </span>
            </div>
            <div className="agenda-names">
              {o.assignments.length === 0 && <span className="muted">{t("occ.none")}</span>}
              {o.assignments.map((a) => (
                <span key={a.id} className={`nm ${a.withdrawn ? "w" : ""} ${a.warnings.length ? "bad" : ""} ${a.confirmState === "CONFIRMED" ? "cf" : a.confirmState === "PENDING" ? "pend" : ""}`}>
                  {a.guideName}
                  {o.status === "NO_DEMAND" ? ` ${t("nt")}` : ""}
                </span>
              ))}
            </div>
            {o.note && <div className="muted">📝 {o.note}</div>}
          </button>
        );
      })}
    </div>
  );
};
