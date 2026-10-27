import { useState } from "react";
import { OccurrenceEditor } from "../components/OccurrenceEditor";
import { useCity } from "../city";
import { useCatalog, useFetch } from "../hooks";
import { addDays, slotLabel, today } from "../format";
import { useI18n } from "../i18n";
import type { OccurrenceView } from "../types";

export const DayPage = () => {
  const [date, setDate] = useState(addDays(today(), 1));
  const [openId, setOpenId] = useState<string | null>(null);
  const { cityId } = useCity();
  const { t, fmtDate } = useI18n();
  const cat = useCatalog();
  const day = useFetch<{ date: string; monthStatus: "NEEDS_DRAFT" | "DRAFT" | "PUBLISHED"; occurrences: OccurrenceView[] }>(cityId ? `/cities/${cityId}/days/${date}` : null);
  if (!cat.data) return <p className="center">{t("loading")}</p>;
  const c = cat.data;
  const occs = [...(day.data?.occurrences ?? [])].sort((a, b) => (c.slots.find((s) => s.id === a.slotId)?.startMinutes ?? 0) - (c.slots.find((s) => s.id === b.slotId)?.startMinutes ?? 0));
  const ms = day.data?.monthStatus;
  return (
    <div>
      <div className="row end">
        <h1>{t("day.title")}</h1>
        {ms && (
          <span className={`badge ${ms === "DRAFT" ? "draft" : ms === "PUBLISHED" ? "published" : ""}`}>
            {ms === "NEEDS_DRAFT" ? t("status.noDraft") : ms === "DRAFT" ? t("status.draft") : t("status.published")}
          </span>
        )}
      </div>
      <div className="row" style={{ marginBottom: 10 }}>
        <button onClick={() => setDate(addDays(date, -1))}>‹</button>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <button onClick={() => setDate(addDays(date, 1))}>›</button>
        <strong>{fmtDate(date)}</strong>
      </div>
      {day.error && <p className="error">{day.error}</p>}
      {occs.length === 0 && !day.loading && <p className="muted">{t("day.empty")}</p>}
      {occs.map((o) => {
        const slot = c.slots.find((s) => s.id === o.slotId);
        const active = o.assignments.filter((a) => !a.withdrawn).length;
        return (
          <div key={o.id} className="card">
            <div className="row end" onClick={() => setOpenId(openId === o.id ? null : o.id)} style={{ cursor: "pointer" }}>
              <strong>{slot ? slotLabel(slot, c) : "?"}</strong>
              <span className={`badge ${o.status === "NO_DEMAND" ? "" : o.missing ? "draft" : "published"}`}>
                {o.status === "NO_DEMAND" ? t("nt") : t("day.guides", { a: active, n: o.needed })}
              </span>
            </div>
            <div className="muted">{o.assignments.map((a) => (a.withdrawn ? `(${a.guideName})` : a.guideName)).join(", ") || "—"}{o.note ? ` · ${o.note}` : ""}</div>
            {openId === o.id && <div style={{ marginTop: 10 }}><OccurrenceEditor occ={o} onChanged={() => day.reload()} /></div>}
          </div>
        );
      })}
    </div>
  );
};
