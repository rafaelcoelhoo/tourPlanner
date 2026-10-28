import { useState } from "react";
import { Link } from "react-router-dom";
import { useCity } from "../city";
import { MonthNav } from "../components/MonthNav";
import { post } from "../api";
import { useCatalog, useFetch } from "../hooks";
import { daysInMonth, errMsg, fmtTime, today as todayIso, weekdayIdx } from "../format";
import { useI18n } from "../i18n";
import { PageHead } from "../components/PageHead";
import type { MyItem } from "../types";

export const MySchedule = () => {
  const { cityId, city, ym, setYm } = useCity();
  const [view, setView] = useState<"list" | "cal">("list");
  const { t, fmtDate, languageName, weekdayShort } = useI18n();
  const cat = useCatalog();
  const sched = useFetch<{ items: MyItem[] }>(`/me/schedule?year=${ym.year}&month=${ym.month}`);
  const [confirmError, setConfirmError] = useState("");
  const setConfirmed = async (i: MyItem, confirmed: boolean) => {
    setConfirmError("");
    try {
      await post(`/assignments/${i.assignmentId}/confirm`, { confirmed });
      await sched.reload();
    } catch (e) {
      setConfirmError(errMsg(e));
      await sched.reload();
    }
  };
  const clock = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" }).format(new Date(iso));
  if (!cityId) return <p className="center">{t("my.chooseCity")}<Link to="/perfil">{t("my.profileWord")}</Link>.</p>;
  if (!cat.data) return <p className="center">{cat.error ?? t("loading")}</p>;
  const c = cat.data;
  const items = sched.data?.items ?? [];
  const label = (i: MyItem) => {
    const s = c.slots.find((x) => x.id === i.slotId);
    const tour = c.tours.find((x) => x.id === s?.tourId)?.name ?? "?";
    const lang = c.languages.find((x) => x.id === s?.languageId);
    const l = lang ? languageName(lang.code, lang.name) : "?";
    const time = s ? fmtTime(s.startMinutes) : "";
    return { time, text: `${tour} · ${l}`, short: `${time} ${tour} ${lang?.code ?? ""}`.trim() };
  };
  const needsConfirm = (i: MyItem) => i.status === "ACTIVE" && i.confirm?.state === "OPEN" && !i.confirmedAt;
  const renderItem = (i: MyItem, showDate = true) => {
    const l = label(i);
    const open = i.status === "ACTIVE" && i.confirm?.state === "OPEN";
    const opensSoon = i.status === "ACTIVE" && i.confirm?.state === "NOT_YET" && Date.parse(i.confirm.opensAt) - Date.now() < 24 * 3_600_000;
    return (
      <div key={i.occurrenceId} className={open && !i.confirmedAt ? "tour-pending" : ""}>
        <strong className="item-time">{showDate ? `${fmtDate(i.date)} · ${l.time}` : l.time}</strong> {i.status === "NO_DEMAND" && <span className="badge">{t("occ.nt")}</span>}
        {i.status === "ACTIVE" && i.adminConfirmed && <span className="badge blue-badge">{t("ac.badge")}</span>}
        {i.status === "ACTIVE" && i.confirmedAt && <span className="badge published">✓ {t("confirm.byMe")}</span>}
        <div>{l.text}</div>
        {i.colleagues.length > 0 && <div className="muted">{t("my.with", { names: i.colleagues.join(", ") })}</div>}
        {i.note && <div className="muted">📝 {i.note}</div>}
        {open && !i.confirmedAt && <button className="primary" style={{ marginTop: 8 }} onClick={() => void setConfirmed(i, true)}>{t("confirm.button")}</button>}
        {open && i.confirmedAt && <button className="link" onClick={() => void setConfirmed(i, false)}>{t("confirm.undo")}</button>}
        {opensSoon && i.confirm && <div className="muted">{t("confirm.opens", { time: clock(i.confirm.opensAt) })}</div>}
      </div>
    );
  };
  const toConfirm = items.filter(needsConfirm);
  const groups = [...items.reduce((m, i) => m.set(i.date, [...(m.get(i.date) ?? []), i]), new Map<string, MyItem[]>())];
  const openItems = items
    .filter((i) => i.status === "ACTIVE" && i.confirm?.state === "OPEN")
    .sort((a, b) => Number(Boolean(a.confirmedAt)) - Number(Boolean(b.confirmedAt)) || a.date.localeCompare(b.date));
  const dates = daysInMonth(ym.year, ym.month);
  const offset = weekdayIdx(dates[0] ?? "");

  return (
    <div>
      <PageHead title={t("my.title")} meta={city?.name} />
      <div className="toolbar">
        <MonthNav year={ym.year} month={ym.month} onChange={(y, m) => setYm({ year: y, month: m })} />
        <div className="seg" role="group">
          <button className={view === "list" ? "on" : ""} aria-pressed={view === "list"} onClick={() => setView("list")}>{t("my.list")}</button>
          <button className={view === "cal" ? "on" : ""} aria-pressed={view === "cal"} onClick={() => setView("cal")}>{t("my.calendar")}</button>
        </div>
      </div>
      {sched.error && <p className="error">{sched.error}</p>}
      {view === "list" && toConfirm.length > 0 && <p className="banner">{t("confirm.banner", { n: toConfirm.length })}</p>}
      {confirmError && <p className="error">{confirmError}</p>}
      {items.length === 0 && !sched.loading && <p className="muted">{t("my.empty")}</p>}
      {view === "list" ? (
        <div className="day-groups">
          {groups.map(([date, its]) => (
            <section key={date} className={`day-group ${date < todayIso() ? "past" : ""} ${date === todayIso() ? "is-today" : ""}`}>
              <h2 className="day-group-title">{fmtDate(date)}</h2>
              <div className="card list">{its.map((i) => renderItem(i, false))}</div>
            </section>
          ))}
        </div>
      ) : (
        <>
        {openItems.length > 0 && (
          <div className="card list confirm-section">
            <h2>{t("my.confirmSection")}</h2>
            {openItems.map((i) => renderItem(i))}
          </div>
        )}
        <div className="cal" style={{ marginTop: 10 }}>
          {Array.from({ length: 7 }, (_, i) => <div key={i} className="h">{weekdayShort(i)}</div>)}
          {Array.from({ length: offset }, (_, i) => <div key={`e${i}`} />)}
          {dates.map((d) => {
            const day = items.filter((i) => i.date === d);
            const needs = day.some(needsConfirm);
            const allDone = day.length > 0 && day.every((i) => i.status !== "ACTIVE" || i.confirmedAt);
            const cls = ["d", day.some((i) => i.status === "ACTIVE") ? "has" : "", needs ? "needs" : day.some((i) => i.adminConfirmed) ? "ac" : "", allDone && !needs && day.some((i) => i.confirmedAt) ? "done" : "", d === todayIso() ? "today" : ""].filter(Boolean).join(" ");
            return (
              <div key={d} className={cls}>
                <strong>{d.slice(8)}</strong>
                {day.map((i) => (
                  <div key={i.occurrenceId} className={`ent ${needsConfirm(i) ? "need" : i.confirmedAt ? "ok" : ""}`}>
                    {needsConfirm(i) ? "! " : i.confirmedAt ? "✓ " : ""}{label(i).short}{i.status === "NO_DEMAND" ? ` ${t("nt")}` : ""}{i.note && i.date >= todayIso() ? " 📝" : ""}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        </>
      )}
      {view === "cal" && <p className="muted cal-legend">{t("my.calLegend")}</p>}
      {view === "cal" && items.some((i) => i.note && i.date >= todayIso()) && (
        <div className="card list">
          <h2>{t("my.notes")}</h2>
          {items.filter((i) => i.note && i.date >= todayIso()).map((i) => (
            <div key={i.occurrenceId}>
              <strong>{fmtDate(i.date)} · {label(i).short}</strong>
              <div className="muted">📝 {i.note}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
