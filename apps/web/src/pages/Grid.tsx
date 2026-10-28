import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, post, type PublishCheck } from "../api";
import { Agenda } from "../components/Agenda";
import { Modal } from "../components/Modal";
import { MonthNav } from "../components/MonthNav";
import { OccurrenceEditor } from "../components/OccurrenceEditor";
import { useConfirm } from "../components/ConfirmDialog";
import { PageHead } from "../components/PageHead";
import { useCity } from "../city";
import { useCatalog, useFetch } from "../hooks";
import { daysInMonth, errMsg, slotLabel, sortSlots, today as todayIso, weekdayIdx } from "../format";
import { useI18n } from "../i18n";
import type { MonthView, OccurrenceView } from "../types";

export const GridPage = () => {
  const { cityId, city, ym, setYm } = useCity();
  const [weekIdx, setWeekIdx] = useState<number | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [view, setViewState] = useState<"table" | "agenda">(() => {
    const saved = localStorage.getItem("gridView");
    if (saved === "table" || saved === "agenda") return saved;
    return window.matchMedia("(max-width: 699px)").matches ? "agenda" : "table";
  });
  const setView = (v: "table" | "agenda") => {
    localStorage.setItem("gridView", v);
    setViewState(v);
  };
  const [agendaDay, setAgendaDay] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const { t, fmtDate, weekdayShort, violation } = useI18n();
  const confirm = useConfirm();
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
  const today = todayIso();
  const selectedDay = agendaDay && monthDates.includes(agendaDay) ? agendaDay : monthDates.includes(today) ? today : (monthDates[0] ?? "");
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
  const warningCount = m.occurrences.reduce((s, o) => s + o.assignments.filter((a) => !a.withdrawn && a.warnings.length > 0).length, 0);

  const publish = async () => {
    const send = (force: boolean) => post(`${base}/publish`, { publish: true, force });
    try {
      await send(false);
    } catch (e) {
      const check: PublishCheck | undefined = e instanceof ApiError ? e.details?.publishCheck : undefined;
      if (!check) throw e;
      const slotName = (id: string) => {
        const s = c.slots.find((x) => x.id === id);
        return s ? slotLabel(s, c) : "?";
      };
      const lines = check.warnings.slice(0, 8).map((w) => `${fmtDate(w.date)} ${slotName(w.slotId)} · ${w.guideName}: ${w.codes.map((code) => violation(code as Parameters<typeof violation>[0])).join(", ")}`);
      if (check.warningCount > lines.length) lines.push(t("publish.more", { n: check.warningCount - lines.length }));
      const badges = [
        check.warningCount > 0 ? t("publish.warnings", { n: check.warningCount }) : "",
        check.missingTotal > 0 ? t("publish.missing", { n: check.missingTotal }) : "",
      ].filter(Boolean);
      const ok = await confirm({ title: t("publish.title"), badges, items: lines, question: t("publish.anyway"), confirmLabel: t("grid.publish"), tone: "warning" });
      if (!ok) throw new Error("");
      await send(true);
    }
  };

  const generate = async () => {
    if (!(await confirm({ title: t("grid.generate"), message: t("grid.generateConfirm"), confirmLabel: t("grid.generate") }))) return;
    await act(async () => {
      const r = await post<{ assigned: number; missingTotal: number }>(`${base}/generate`);
      setMsg(t("grid.generated", { n: r.assigned, m: r.missingTotal }));
    }, "");
  };

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
    return `${o.adminConfirmed ? "ac" : o.missing ? "incomplete" : "complete"} cell${warn}`;
  };

  return (
    <div>
      <PageHead
        title={t("nav.schedule")}
        meta={
          <>
            {city && <span>{city.name}</span>}
            <span className={`badge ${m.status === "DRAFT" ? "draft" : m.status === "PUBLISHED" ? "published" : ""}`}>
              {m.status === "NEEDS_DRAFT" ? t("status.noDraft") : m.status === "DRAFT" ? t("status.draft") : t("status.published")}
            </span>
          </>
        }
        actions={<MonthNav year={ym.year} month={ym.month} onChange={(y, mo) => { setYm({ year: y, month: mo }); setWeekIdx(null); }} />}
      />
      <div className="toolbar">
        <div className="toolbar-group">
          <div className="seg" role="group">
            <button className={view === "table" ? "on" : ""} aria-pressed={view === "table"} onClick={() => setView("table")}>{t("view.table")}</button>
            <button className={view === "agenda" ? "on" : ""} aria-pressed={view === "agenda"} onClick={() => setView("agenda")}>{t("view.agenda")}</button>
          </div>
          {view === "table" && (
            <button className="ghost" onClick={() => setWeekIdx(weekIdx !== null ? null : 0)}>
              {weekIdx !== null ? t("grid.viewMonth") : t("grid.viewWeek")}
            </button>
          )}
          {view === "table" && weekIdx !== null && (
            <>
              <button className="ghost" disabled={weekIdx <= 0} onClick={() => setWeekIdx(Math.max(0, weekIdx - 1))}>{t("grid.prevWeek")}</button>
              <button className="ghost" disabled={weekIdx >= weeks.length - 1} onClick={() => setWeekIdx(Math.min(weeks.length - 1, weekIdx + 1))}>{t("grid.nextWeek")}</button>
            </>
          )}
        </div>
        <div className="toolbar-group">
          <Link className="btn" to="/necessidades">{t("grid.matrix")}</Link>
          {m.status !== "NEEDS_DRAFT" && (
            <button onClick={() => void act(() => (m.status === "PUBLISHED" ? post(`${base}/publish`, { publish: false }) : publish()), m.status === "PUBLISHED" ? t("grid.unpublishedMsg") : t("grid.publishedMsg"))}>
              {m.status === "PUBLISHED" ? t("grid.unpublish") : t("grid.publish")}
            </button>
          )}
          <button className="primary" disabled={!m.needsConfirmedAt || m.status === "PUBLISHED"} onClick={() => void generate()}>{t("grid.generate")}</button>
        </div>
      </div>
      {!m.needsConfirmedAt && <p className="notice error-notice">{t("grid.needsNotConfirmed")}</p>}
      {msg && <p className="notice" role="status">{msg}</p>}
      {m.occurrences.length > 0 && (
        <div className="summary">
          {missingTotal > 0 ? <span className="stat bad">{t("grid.missingTotal", { n: missingTotal })}</span> : <span className="stat good">{t("grid.allComplete")}</span>}
          {warningCount > 0 && <span className="stat warn">{t("grid.warningCount", { n: warningCount })}</span>}
          <button className="sm ghost legend-toggle" aria-expanded={legendOpen} aria-controls="grid-legend" onClick={() => setLegendOpen(!legendOpen)}>{t("legend.title")}</button>
          <ul id="grid-legend" className={`legend ${legendOpen ? "open" : ""}`} aria-label={t("legend.title")}>
            <li><i className="sw complete" />{t("occ.complete")}</li>
            <li><i className="sw incomplete" />{t("legend.missing")}</li>
            <li><i className="sw ac" />{t("ac.badge")}</li>
            <li><i className="sw nt" />{t("nt")}</li>
            <li><i className="sw off" />{t("legend.off")}</li>
            {m.status === "PUBLISHED" && <li><b className="cf-mark">✓</b>{t("confirm.byGuide")}</li>}
            {m.status === "PUBLISHED" && <li><b className="pend-mark">○</b>{t("confirm.pending")} · {t("legend.window", { h: c.settings.confirmWindowHours })}</li>}
          </ul>
        </div>
      )}
      {view === "agenda" && (
        <Agenda dates={monthDates} occurrences={m.occurrences} catalog={c} selected={selectedDay} today={today} onSelect={setAgendaDay} onOpen={setOpenId} />
      )}
      {view === "table" && <div className="scroll">
        <table className="grid">
          <thead>
            <tr>
              <th className="sl">{t("grid.slot")}</th>
              {dates.map((d) => <th key={d} className={weekdayIdx(d) === 0 ? "we" : ""}>{weekIdx !== null ? fmtDate(d) : `${d.slice(8)} ${weekdayShort(weekdayIdx(d))}`}</th>)}
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
                            <span key={a.id} className={`nm ${a.withdrawn ? "w" : ""} ${a.warnings.length ? "bad" : ""} ${a.confirmState === "CONFIRMED" ? "cf" : a.confirmState === "PENDING" ? "pend" : ""}`}>{a.guideName}{o.status === "NO_DEMAND" ? ` ${t("nt")}` : ""}</span>
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
      </div>}
      {open && (
        <Modal title={`${slotLabel(cat.data.slots.find((s) => s.id === open.slotId) ?? cat.data.slots[0]!, c)} · ${fmtDate(open.date)}`} onClose={() => setOpenId(null)}>
          <OccurrenceEditor occ={open} onChanged={() => month.reload()} />
        </Modal>
      )}
    </div>
  );
};
