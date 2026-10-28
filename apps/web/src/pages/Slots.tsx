import { useState, type FormEvent } from "react";
import { patch, post, put } from "../api";
import { useCity } from "../city";
import { useCatalog } from "../hooks";
import { errMsg, fmtTime, parseTime, slotLabel, sortSlots } from "../format";
import { useI18n } from "../i18n";
import type { Settings } from "../types";

interface Form { id?: string; tourId: string; languageId: string; time: string; durationMin: number; weekdays: number[]; defaultNeeded: number; active: boolean }

export const SlotsPage = () => {
  const { cityId, city, reloadCities, setCityId } = useCity();
  const cat = useCatalog();
  const { t: tr, weekdayShort, languageName } = useI18n();
  const [cityName, setCityName] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [tourName, setTourName] = useState("");
  const [msg, setMsg] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  if (!cat.data) return <p className="center">{cat.error ?? tr("loading")}</p>;
  const c = cat.data;
  const st = settings ?? c.settings;

  const blank = (): Form => ({ tourId: c.tours[0]?.id ?? "", languageId: c.languages[0]?.id ?? "", time: "10:00", durationMin: c.settings.defaultDurationMin, weekdays: [1, 2, 3, 4, 5, 6, 7], defaultNeeded: 1, active: true });
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      setMsg(ok);
      await cat.reload();
    } catch (e) {
      setMsg(errMsg(e));
    }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const body = { tourId: form.tourId, languageId: form.languageId, startMinutes: parseTime(form.time), durationMin: form.durationMin, weekdays: form.weekdays, defaultNeeded: form.defaultNeeded, active: form.active };
    await run(() => (form.id ? patch(`/slots/${form.id}`, body) : post("/slots", body)), tr("slots.saved"));
    setForm(null);
  };

  const slotForm = form && (
    <form className="card slot-edit" onSubmit={(e) => void submit(e)}>
            <div className="row">
              <label>{tr("slots.tour")}<select value={form.tourId} onChange={(e) => setForm({ ...form, tourId: e.target.value })}>{c.tours.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
              <label>{tr("slots.language")}<select value={form.languageId} onChange={(e) => setForm({ ...form, languageId: e.target.value })}>{c.languages.map((l) => <option key={l.id} value={l.id}>{languageName(l.code, l.name)}</option>)}</select></label>
              <label>{tr("slots.time")}<input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required /></label>
              <label>{tr("slots.duration")}<input type="number" min={15} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} /></label>
              <label>{tr("slots.defaultGuides")}<input type="number" min={0} value={form.defaultNeeded} onChange={(e) => setForm({ ...form, defaultNeeded: Number(e.target.value) })} /></label>
            </div>
            <div className="chips" style={{ margin: "10px 0" }}>
              {Array.from({ length: 7 }, (_, i) => weekdayShort(i)).map((w, i) => {
                const on = form.weekdays.includes(i + 1);
                return <button type="button" key={w} className={`chip ${on ? "on" : ""}`} onClick={() => setForm({ ...form, weekdays: on ? form.weekdays.filter((x) => x !== i + 1) : [...form.weekdays, i + 1] })}>{w}</button>;
              })}
            </div>
            <label className="row"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> {tr("slots.active")}</label>
            <div className="row"><button className="primary">{tr("save")}</button><button type="button" onClick={() => setForm(null)}>{tr("cancel")}</button></div>
          </form>
  );

  return (
    <div>
      <h1>{tr("slots.title")}{city ? ` · ${city.name}` : ""}</h1>
      {msg && <p className="muted">{msg}</p>}
      <div className="card">
        <h2>{tr("slots.cities")}</h2>
        <div className="row">
          <input placeholder={tr("slots.newCity")} value={cityName} onChange={(e) => setCityName(e.target.value)} />
          <button disabled={!cityName.trim()} onClick={() => void run(async () => {
            const created = await post<{ id: string }>("/cities", { name: cityName.trim() });
            await reloadCities();
            setCityId(created.id);
            setCityName("");
          }, tr("slots.cityCreated"))}>{tr("slots.createCity")}</button>
        </div>
        <p className="muted">{tr("slots.cityHelp")}</p>
      </div>

      <div className="card">
        <h2>{tr("slots.tours")}</h2>
        <div className="chips">
          {c.tours.map((t) => (
            <button key={t.id} className="chip" title={tr("slots.tourToggle")}
              onClick={() => void run(() => patch(`/tours/${t.id}`, { kind: t.kind === "PRIMARY" ? "SECONDARY" : "PRIMARY" }), tr("slots.tourUpdated"))}>
              {t.name} · {t.kind === "PRIMARY" ? tr("ov.primary") : tr("ov.secondary")}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <input placeholder={tr("slots.newTour")} value={tourName} onChange={(e) => setTourName(e.target.value)} />
          <button disabled={!tourName.trim()} onClick={() => void run(() => post("/tours", { cityId, name: tourName.trim(), kind: "SECONDARY" }), tr("slots.tourCreated")).then(() => setTourName(""))}>{tr("slots.create")}</button>
        </div>
      </div>

      <div className="card">
        <h2>{tr("slots.rules")}</h2>
        <div className="row">
          <label>{tr("slots.afternoonStart")}<input type="time" value={fmtTime(st.morningCutoffMinutes)} onChange={(e) => setSettings({ ...st, morningCutoffMinutes: parseTime(e.target.value) })} /></label>
          <label>{tr("slots.minGap")}<input type="number" min={0} value={st.minGapMinutes} onChange={(e) => setSettings({ ...st, minGapMinutes: Number(e.target.value) })} /></label>
          <label>{tr("slots.maxPerDay")}<input type="number" min={1} value={st.maxToursPerDay} onChange={(e) => setSettings({ ...st, maxToursPerDay: Number(e.target.value) })} /></label>
          <label>{tr("slots.defaultDuration")}<input type="number" min={15} value={st.defaultDurationMin} onChange={(e) => setSettings({ ...st, defaultDurationMin: Number(e.target.value) })} /></label>
          <label>{tr("slots.confirmWindow")}<input type="number" min={1} max={48} value={st.confirmWindowHours} onChange={(e) => setSettings({ ...st, confirmWindowHours: Number(e.target.value) })} /></label>
          <button disabled={!settings} onClick={() => void run(() => put("/settings", settings), tr("slots.rulesSaved"))}>{tr("save")}</button>
        </div>
      </div>

      <div className="row end"><h2>{tr("slots.count", { n: c.slots.length })}</h2><button className="primary" onClick={() => setForm(blank())}>{tr("slots.new")}</button></div>
      {form && !form.id && slotForm}
      <div className="card list">
        {sortSlots(c.slots, c).map((s) => (
          <div key={s.id}>
            <div className="row end">
              <div>
                <strong>{slotLabel(s, c)}</strong> {s.active ? <span className="badge published">{tr("slots.active")}</span> : <span className="badge">{tr("slots.inactive")}</span>}
                <div className="muted">{tr("slots.summary", { days: Array.from({ length: 7 }, (_, i) => weekdayShort(i)).filter((_, i) => s.weekdays.includes(i + 1)).join(" ") || "—", min: s.durationMin, n: s.defaultNeeded })}</div>
              </div>
              <button disabled={form?.id === s.id} onClick={() => setForm({ id: s.id, tourId: s.tourId, languageId: s.languageId, time: fmtTime(s.startMinutes), durationMin: s.durationMin, weekdays: s.weekdays, defaultNeeded: s.defaultNeeded, active: s.active })}>{tr("edit")}</button>
            </div>
            {form?.id === s.id && <div style={{ marginTop: 10 }}>{slotForm}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};
