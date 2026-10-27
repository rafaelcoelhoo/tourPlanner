import { useState } from "react";
import { Link } from "react-router-dom";
import { useCity } from "../city";
import { MonthNav } from "../components/MonthNav";
import { useCatalog, useFetch } from "../hooks";
import { daysInMonth, fmtTime, weekdayIdx } from "../format";
import { useI18n } from "../i18n";
import type { MyItem } from "../types";

export const MySchedule = () => {
  const { cityId, city, ym, setYm } = useCity();
  const [view, setView] = useState<"list" | "cal">("list");
  const { t, fmtDate, languageName, weekdayInitial } = useI18n();
  const cat = useCatalog();
  const sched = useFetch<{ items: MyItem[] }>(`/me/schedule?year=${ym.year}&month=${ym.month}`);
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
  const dates = daysInMonth(ym.year, ym.month);
  const offset = weekdayIdx(dates[0] ?? "");

  return (
    <div>
      <h1>{t("my.title")}{city ? ` · ${city.name}` : ""}</h1>
      <div className="row end">
        <MonthNav year={ym.year} month={ym.month} onChange={(y, m) => setYm({ year: y, month: m })} />
        <button onClick={() => setView(view === "list" ? "cal" : "list")}>{view === "list" ? t("my.calendar") : t("my.list")}</button>
      </div>
      {sched.error && <p className="error">{sched.error}</p>}
      {items.length === 0 && !sched.loading && <p className="muted">{t("my.empty")}</p>}
      {view === "list" ? (
        <div className="card list">
          {items.map((i) => {
            const l = label(i);
            return (
              <div key={i.occurrenceId}>
                <strong>{fmtDate(i.date)} · {l.time}</strong> {i.status === "NO_DEMAND" && <span className="badge">{t("occ.nt")}</span>}
                <div>{l.text}</div>
                {i.colleagues.length > 0 && <div className="muted">{t("my.with", { names: i.colleagues.join(", ") })}</div>}
                {i.note && <div className="muted">📝 {i.note}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cal" style={{ marginTop: 10 }}>
          {Array.from({ length: 7 }, (_, i) => <div key={i} className="h">{weekdayInitial(i)}</div>)}
          {Array.from({ length: offset }, (_, i) => <div key={`e${i}`} />)}
          {dates.map((d) => {
            const day = items.filter((i) => i.date === d);
            return (
              <div key={d} className={`d ${day.some((i) => i.status === "ACTIVE") ? "has" : ""}`}>
                <strong>{d.slice(8)}</strong>
                {day.map((i) => <div key={i.occurrenceId}>{label(i).short}{i.status === "NO_DEMAND" ? ` ${t("nt")}` : ""}</div>)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
