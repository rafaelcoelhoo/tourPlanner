import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { post } from "../api";
import { Modal } from "../components/Modal";
import { MonthNav } from "../components/MonthNav";
import { OccurrenceEditor } from "../components/OccurrenceEditor";
import { useCity } from "../city";
import { useCatalog, useFetch } from "../hooks";
import { daysInMonth, errMsg, slotLabel, sortSlots, weekdayIdx } from "../format";
import { useI18n } from "../i18n";
import type { MonthView, OccurrenceView } from "../types";

export const GridPage = () => {
  const { cityId, ym, setYm } = useCity();
  const [weekIdx, setWeekIdx] = useState<number | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [showStats, setShowStats] = useState(false);
  const { t, fmtDate, weekdayInitial } = useI18n();
  const cat = useCatalog();
  const base = `/cities/${cityId}/months/${ym.year}/${ym.month}`;
  const month = useFetch<MonthView>(cityId ? base : null);

  const byKey = useMemo(() => new Map((month.data?.occurrences ?? []).map((o) => [`${o.slotId}|${o.date}`, o])), [month.data]);
  const monthDates = useMemo(() => daysInMonth(ym.year, ym.month), [ym.year, ym.month]);
  const weeks = useMemo(() => {
    const out: string[][] = [];
    for (const d of monthDates) {
      if (out.length === 0 || weekdayIdx(d) === 0) out.push([d]);
      else out[out.length - 1]!.push(d);
    }
    return out;
  }, [monthDates]);
  const dates = weekIdx !== null ? (weeks[weekIdx] ?? monthDates) : monthDates;
  const slots = useMemo(() => {
    if (!cat.data) return [];
    const used = new Set((month.data?.occurrences ?? []).map((o) => o.slotId));
    return sortSlots(cat.data.slots.filter((s) => s.active || used.has(s.id)), cat.data);
  }, [cat.data, month.data]);

  if (!cat.data || !month.data) return <p className="center">{cat.error ?? month.error ?? t("loading")}</p>;
  const c = cat.data;
  const m = month.data;
  const open = openId ? m.occurrences.find((o) => o.id === openId) : undefined;
  const missingTotal = m.occurrences.reduce((s, o) => s + o.missing, 0);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg("");
    try {
      await fn();
      setMsg(ok);
      await month.reload();
    } catch (e) {
      setMsg(errMsg(e));
    }
  };

  const cellClass = (o: OccurrenceView | undefined): string => {
    if (!o || o.needed === 0) return "off";
    if (o.status === "NO_DEMAND") return "nt cell";
    const warn = o.assignments.some((a) => a.warnings.length > 0) ? " warnc" : "";
    return `${o.missing ? "incomplete" : "complete"} cell${warn}`;
  };

  return (
    <div>
      <div className="row end">
        <MonthNav year={ym.year} month={ym.month} onChange={(y, mo) => { setYm({ year: y, month: mo }); setWeekIdx(null); }} />
        <span className={`badge ${m.status === "DRAFT" ? "draft" : m.status === "PUBLISHED" ? "published" : ""}`}>
          {m.status === "NEEDS_DRAFT" ? t("status.noDraft") : m.status === "DRAFT" ? t("status.draft") : t("status.published")}
        </span>
      </div>
      <div className="row" style={{ margin: "10px 0" }}>
        <button onClick={() => setWeekIdx(weekIdx !== null ? null : 0)}>
          {weekIdx !== null ? t("grid.viewMonth") : t("grid.viewWeek")}
        </button>
        {weekIdx !== null && (
          <>
            <button disabled={weekIdx <= 0} onClick={() => setWeekIdx(Math.max(0, weekIdx - 1))}>{t("grid.prevWeek")}</button>
            <button disabled={weekIdx >= weeks.length - 1} onClick={() => setWeekIdx(Math.min(weeks.length - 1, weekIdx + 1))}>{t("grid.nextWeek")}</button>
          </>
        )}
        <Link to="/necessidades"><button>{t("grid.matrix")}</button></Link>
        <button className="primary" disabled={!m.needsConfirmedAt || m.status === "PUBLISHED"}
          onClick={() => window.confirm(t("grid.generateConfirm")) && void act(async () => {
            const r = await post<{ assigned: number; missingTotal: number }>(`${base}/generate`);
            setMsg(t("grid.generated", { n: r.assigned, m: r.missingTotal }));
          }, "")}>{t("grid.generate")}</button>
        {m.status !== "NEEDS_DRAFT" && (
          <button onClick={() => void act(() => post(`${base}/publish`, { publish: m.status !== "PUBLISHED" }), m.status === "PUBLISHED" ? t("grid.unpublishedMsg") : t("grid.publishedMsg"))}>
            {m.status === "PUBLISHED" ? t("grid.unpublish") : t("grid.publish")}
          </button>
        )}
        <button onClick={() => setShowStats(!showStats)}>{t("grid.load")}</button>
      </div>
      {!m.needsConfirmedAt && <p className="error">{t("grid.needsNotConfirmed")}</p>}
      {m.occurrences.length > 0 && <p className={missingTotal ? "miss" : "muted"}>{missingTotal ? t("grid.missingTotal", { n: missingTotal }) : t("grid.allComplete")}</p>}
      {msg && <p className="muted">{msg}</p>}
      {showStats && (
        <div className="card scroll">
          <table className="grid"><thead><tr><th className="sl">{t("stats.guide")}</th><th>{t("stats.primary")}</th><th>{t("stats.secondary")}</th><th>{t("stats.availableDays")}</th><th>{t("stats.ratio")}</th></tr></thead>
            <tbody>{m.stats.map((s) => <tr key={s.guideId}><th className="sl">{s.name}</th><td>{s.primary}</td><td>{s.secondary}</td><td>{s.availableDays}</td><td>{s.ratio.toFixed(2)}</td></tr>)}</tbody></table>
        </div>
      )}
      <div className="scroll">
        <table className="grid">
          <thead>
            <tr>
              <th className="sl">{t("grid.slot")}</th>
              {dates.map((d) => <th key={d} className={weekdayIdx(d) === 0 ? "we" : ""}>{weekIdx !== null ? fmtDate(d) : `${d.slice(8)} ${weekdayInitial(weekdayIdx(d))}`}</th>)}
            </tr>
          </thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.id}>
                <th className="sl">{slotLabel(s, c)}</th>
                {dates.map((d) => {
                  const o = byKey.get(`${s.id}|${d}`);
                  const cls = cellClass(o);
                  return (
                    <td key={d} className={`${cls} ${weekdayIdx(d) === 0 ? "we" : ""}`} onClick={() => o && o.needed > 0 && setOpenId(o.id)}>
                      {o && o.needed > 0 && (
                        <>
                          {o.assignments.map((a) => (
                            <span key={a.id} className={`nm ${a.withdrawn ? "w" : ""} ${a.warnings.length ? "bad" : ""}`}>{a.guideName}{o.status === "NO_DEMAND" ? ` ${t("nt")}` : ""}</span>
                          ))}
                          {o.status === "ACTIVE" && o.missing > 0 && <span className="miss">{t("grid.missingShort", { n: o.missing })}</span>}
                          {o.status === "NO_DEMAND" && o.assignments.length === 0 && <span className="nm">{t("nt")}</span>}
                          {o.note && <span className="notei">📝 {o.note}</span>}
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal title={`${slotLabel(cat.data.slots.find((s) => s.id === open.slotId) ?? cat.data.slots[0]!, c)} · ${fmtDate(open.date)}`} onClose={() => setOpenId(null)}>
          <OccurrenceEditor occ={open} onChanged={() => month.reload()} />
        </Modal>
      )}
    </div>
  );
};
