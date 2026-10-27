import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { del, post, put } from "../api";
import { useAuth } from "../auth";
import { useCity } from "../city";
import { useCatalog, useFetch } from "../hooks";
import { errMsg, fmtTime, parseTime, slotLabel, sortSlots } from "../format";
import { useI18n, type Key } from "../i18n";
import type { Period } from "@schedule/core";
import type { Profile } from "../types";

type RestrictionKind = Period | "UNTIL" | "FROM";
const RESTRICTION_KINDS: RestrictionKind[] = ["FULL_DAY", "MORNING", "AFTERNOON", "UNTIL", "FROM"];
const PERIOD_KEYS: Period[] = ["FULL_DAY", "MORNING", "AFTERNOON"];

export const ProfilePage = () => {
  const params = useParams();
  const { me, refresh } = useAuth();
  const { cities } = useCity();
  const { t: tr, weekdayLong, periodLabel, languageName } = useI18n();
  const id = params.id ?? me?.id ?? "";
  const prof = useFetch<Profile>(`/guides/${id}/profile`);
  const cat = useCatalog(prof.data ? prof.data.cityId : null);
  const [msg, setMsg] = useState("");
  const [un, setUn] = useState({ startDate: "", endDate: "", period: "FULL_DAY" as Period, slotId: "" });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [rs, setRs] = useState({ weekday: 1, kind: "FULL_DAY" as RestrictionKind, time: "17:00" });
  const run = async (fn: () => Promise<unknown>) => {
    setMsg("");
    try {
      await fn();
      await prof.reload();
    } catch (e) {
      setMsg(errMsg(e));
    }
  };
  const changeCity = async (cityId: string) => {
    if (prof.data?.cityId && !window.confirm(tr("prof.cityChangeConfirm"))) return;
    await run(() => put(`/guides/${id}/city`, { cityId }));
    if (id === me?.id) await refresh();
  };
  if (!prof.data) return <p className="center">{prof.error ?? tr("loading")}</p>;

  const isAdmin = me?.role === "ADMIN";
  const guideCityId = prof.data.cityId;
  const cityName = cities.find((ct) => ct.id === guideCityId)?.name;
  const cityCard = (
    <div className="card">
      {isAdmin ? (
        <>
          <label>{tr("prof.city")}
            <select value={prof.data.cityId ?? ""} onChange={(e) => e.target.value && void changeCity(e.target.value)}>
              {!prof.data.cityId && <option value="">{tr("prof.selectCity")}</option>}
              {cities.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
            </select>
          </label>
          <p className="muted">{tr("prof.cityChangeHelp")}</p>
        </>
      ) : (
        <p>{tr("prof.cityReadonly", { name: cityName ?? "—" })}</p>
      )}
    </div>
  );
  if (!prof.data.cityId) return <div><h1>{prof.data.name}</h1>{msg && <p className="error">{msg}</p>}{cityCard}</div>;
  if (!cat.data) return <p className="center">{cat.error ?? tr("loading")}</p>;
  const c = cat.data;
  const p = prof.data;
  const has = (t: string, l: string) => p.qualifications.some((q) => q.tourId === t && q.languageId === l);

  const toggleQ = (t: string, l: string) =>
    run(() => put(`/guides/${id}/qualifications`, { qualifications: has(t, l) ? p.qualifications.filter((q) => !(q.tourId === t && q.languageId === l)) : [...p.qualifications, { tourId: t, languageId: l }] }));
  const addUn = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await post(`/guides/${id}/unavailabilities`, { startDate: un.startDate, endDate: un.endDate || un.startDate, period: un.period, slotId: un.slotId || null });
      setUn({ startDate: "", endDate: "", period: "FULL_DAY", slotId: "" });
    });
  };
  const addRs = (e: FormEvent) => {
    e.preventDefault();
    const timed = rs.kind === "UNTIL" || rs.kind === "FROM";
    void run(() =>
      post(`/guides/${id}/restrictions`, {
        weekday: rs.weekday,
        period: timed ? "FULL_DAY" : rs.kind,
        notBeforeMinutes: rs.kind === "FROM" ? parseTime(rs.time) : null,
        notAfterMinutes: rs.kind === "UNTIL" ? parseTime(rs.time) : null,
      }),
    );
  };
  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await post("/auth/password", pw);
      setPw({ current: "", next: "" });
      setPwMsg({ ok: true, text: tr("pw.done") });
    } catch (err) {
      setPwMsg({ ok: false, text: errMsg(err) });
    }
  };
  const slotName = (sid: string) => {
    const s = c.slots.find((x) => x.id === sid);
    return s ? slotLabel(s, c) : "?";
  };

  return (
    <div>
      <h1>{p.name}</h1>
      <p className="muted">{p.email}{p.phone ? ` · ${p.phone}` : ""}</p>
      {msg && <p className="error">{msg}</p>}
      {cityCard}

      <div className="card">
        <h2>{tr("prof.tours")}</h2>
        {c.tours.filter((t) => t.active).map((t) => (
          <div key={t.id} style={{ marginBottom: 8 }}>
            <div><strong>{t.name}</strong></div>
            <div className="chips">
              {c.languages.map((l) => <button key={l.id} className={`chip ${has(t.id, l.id) ? "on" : ""}`} onClick={() => void toggleQ(t.id, l.id)}>{languageName(l.code, l.name)}</button>)}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>{tr("prof.unav")}</h2>
        <form className="row" onSubmit={addUn}>
          <label>{tr("prof.from")}<input type="date" value={un.startDate} onChange={(e) => setUn({ ...un, startDate: e.target.value })} required /></label>
          <label>{tr("prof.to")}<input type="date" value={un.endDate} min={un.startDate} onChange={(e) => setUn({ ...un, endDate: e.target.value })} /></label>
          <label>{tr("prof.period")}<select value={un.period} onChange={(e) => setUn({ ...un, period: e.target.value as Period })}>{PERIOD_KEYS.map((k) => <option key={k} value={k}>{periodLabel(k)}</option>)}</select></label>
          <label>{tr("prof.slotOpt")}<select value={un.slotId} onChange={(e) => setUn({ ...un, slotId: e.target.value })}><option value="">{tr("prof.allSlots")}</option>{sortSlots(c.slots, c).map((s) => <option key={s.id} value={s.id}>{slotLabel(s, c)}</option>)}</select></label>
          <button className="primary">{tr("add")}</button>
        </form>
        <div className="list">
          {p.unavailabilities.length === 0 && <div className="muted">{tr("prof.availableAll")}</div>}
          {p.unavailabilities.map((u) => (
            <div key={u.id} className="row end">
              <span>{u.startDate === u.endDate ? u.startDate : `${u.startDate} → ${u.endDate}`} · {u.slotId ? slotName(u.slotId) : periodLabel(u.period)}</span>
              <button className="danger" onClick={() => void run(() => del(`/guides/${id}/unavailabilities/${u.id}`))}>{tr("remove")}</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>{tr("prof.restrictions")}</h2>
        <form className="row" onSubmit={addRs}>
          <label>{tr("prof.day")}<select value={rs.weekday} onChange={(e) => setRs({ ...rs, weekday: Number(e.target.value) })}>{Array.from({ length: 7 }, (_, i) => <option key={i} value={i + 1}>{weekdayLong(i)}</option>)}</select></label>
          <label>{tr("prof.restriction")}<select value={rs.kind} onChange={(e) => setRs({ ...rs, kind: e.target.value as RestrictionKind })}>{RESTRICTION_KINDS.map((k) => <option key={k} value={k}>{tr(`prof.kind.${k}` as Key)}</option>)}</select></label>
          {(rs.kind === "UNTIL" || rs.kind === "FROM") && <label>{tr("prof.hour")}<input type="time" value={rs.time} onChange={(e) => setRs({ ...rs, time: e.target.value })} required /></label>}
          <button className="primary">{tr("add")}</button>
        </form>
        <div className="list">
          {p.restrictions.map((r) => (
            <div key={r.id} className="row end">
              <span>{weekdayLong(r.weekday - 1)} · {r.notAfterMinutes != null ? tr("prof.show.UNTIL", { t: fmtTime(r.notAfterMinutes) }) : r.notBeforeMinutes != null ? tr("prof.show.FROM", { t: fmtTime(r.notBeforeMinutes) }) : tr(`prof.show.${r.period}` as Key)}</span>
              <button className="danger" onClick={() => void run(() => del(`/guides/${id}/restrictions/${r.id}`))}>{tr("remove")}</button>
            </div>
          ))}
        </div>
      </div>
      {id === me?.id && (
        <form className="card" onSubmit={(e) => void changePw(e)}>
          <h2>{tr("pw.title")}</h2>
          <div className="row">
            <label>{tr("pw.current")}<input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required autoComplete="current-password" /></label>
            <label>{tr("pw.next")}<input type="password" minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required autoComplete="new-password" /></label>
            <button className="primary">{tr("pw.submit")}</button>
          </div>
          {pwMsg && <p className={pwMsg.ok ? "ok" : "error"}>{pwMsg.text}</p>}
        </form>
      )}
    </div>
  );
};
