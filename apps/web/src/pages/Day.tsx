import { useState } from "react";
import { OccurrenceEditor } from "../components/OccurrenceEditor";
import { useCity } from "../city";
import { patch, post } from "../api";
import { useCatalog, useFetch } from "../hooks";
import { addDays, errMsg, slotLabel, today } from "../format";
import { useI18n } from "../i18n";
import type { OccurrenceView } from "../types";

export const DayPage = () => {
  const [date, setDate] = useState(addDays(today(), 1));
  const [openId, setOpenId] = useState<string | null>(null);
  const { cityId } = useCity();
  const { t, fmtDate } = useI18n();
  const cat = useCatalog();
  const [err, setErr] = useState("");
  const day = useFetch<{ date: string; monthStatus: "NEEDS_DRAFT" | "DRAFT" | "PUBLISHED"; occurrences: OccurrenceView[] }>(cityId ? `/cities/${cityId}/days/${date}` : null);
  if (!cat.data) return <p className="center">{t("loading")}</p>;
  const c = cat.data;
  const occs = [...(day.data?.occurrences ?? [])].sort((a, b) => (c.slots.find((s) => s.id === a.slotId)?.startMinutes ?? 0) - (c.slots.find((s) => s.id === b.slotId)?.startMinutes ?? 0));
  const ms = day.data?.monthStatus;
  const act = async (fn: () => Promise<unknown>) => {
    setErr("");
    try {
      await fn();
      await day.reload();
    } catch (e) {
      setErr(errMsg(e));
    }
  };
  const confirmable = occs.filter((o) => o.status === "ACTIVE");
  const allConfirmed = confirmable.length > 0 && confirmable.every((o) => o.adminConfirmed);
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
      {confirmable.length > 0 && (
        <div className="row" style={{ marginBottom: 10 }}>
          <button className={allConfirmed ? "" : "blue"} onClick={() => void act(() => post(`/cities/${cityId}/days/${date}/confirm`, { confirmed: !allConfirmed }))}>
            {allConfirmed ? t("ac.undo") : t("ac.confirmAll")}
          </button>
        </div>
      )}
      {day.error && <p className="error">{day.error}</p>}
      {err && <p className="error">{err}</p>}
      {occs.length === 0 && !day.loading && <p className="muted">{t("day.empty")}</p>}
      {occs.map((o) => {
        const slot = c.slots.find((s) => s.id === o.slotId);
        const active = o.assignments.filter((a) => !a.withdrawn).length;
        const confirmed = o.assignments.filter((a) => !a.withdrawn && a.confirmState === "CONFIRMED").length;
        return (
          <div key={o.id} className={`card ${o.adminConfirmed ? "ac-card" : ""}`}>
            <div className="row end" onClick={() => setOpenId(openId === o.id ? null : o.id)} style={{ cursor: "pointer" }}>
              <strong>{slot ? slotLabel(slot, c) : "?"}</strong>
              <span className={`badge ${o.status === "NO_DEMAND" ? "" : o.missing ? "draft" : "published"}`}>
                {o.status === "NO_DEMAND" ? t("nt") : t("day.guides", { a: active, n: o.needed })}
              </span>
            </div>
            {o.status === "ACTIVE" && (
              <div className="row" style={{ margin: "6px 0" }}>
                {o.adminConfirmed && <span className="badge blue-badge">{t("ac.badge")}</span>}
                <button className={o.adminConfirmed ? "link" : "blue"} onClick={() => void act(() => patch(`/occurrences/${o.id}`, { adminConfirmed: !o.adminConfirmed }))}>
                  {o.adminConfirmed ? t("ac.undo") : t("ac.confirm")}
                </button>
              </div>
            )}
            <div className="muted">
              {o.assignments.length === 0 && "—"}
              {o.assignments.map((a, idx) => (
                <span key={a.id} className={`${a.confirmState === "CONFIRMED" ? "cf-inline" : a.confirmState === "PENDING" ? "pend-inline" : ""}`}>
                  {idx > 0 && ", "}
                  {a.confirmState === "CONFIRMED" ? "✓ " : a.confirmState === "PENDING" ? "○ " : ""}
                  {a.withdrawn ? `(${a.guideName})` : a.guideName}
                </span>
              ))}
              {o.note ? ` · ${o.note}` : ""}
              {o.status === "ACTIVE" && active > 0 && <> · {t("confirm.count", { a: confirmed, n: active })}</>}
            </div>
            {openId === o.id && <div style={{ marginTop: 10 }}><OccurrenceEditor occ={o} onChanged={() => day.reload()} /></div>}
          </div>
        );
      })}
    </div>
  );
};
