import { useEffect, useMemo, useState } from "react";
import { put } from "../api";
import { MonthNav } from "../components/MonthNav";
import { useCity } from "../city";
import { useI18n } from "../i18n";
import { PageHead } from "../components/PageHead";
import { useCatalog, useFetch } from "../hooks";
import { daysInMonth, errMsg, slotLabel, sortSlots, weekdayIdx } from "../format";

interface NeedsData { status: string; confirmed: boolean; cells: { slotId: string; date: string; needed: number }[] }

export const NeedsPage = () => {
  const { cityId, ym, setYm } = useCity();
  const { t, weekdayShort } = useI18n();
  const cat = useCatalog();
  const base = `/cities/${cityId}/months/${ym.year}/${ym.month}/needs`;
  const needs = useFetch<NeedsData>(cityId ? base : null);
  const [vals, setVals] = useState<Map<string, number>>(new Map());
  const [msg, setMsg] = useState("");
  const dates = daysInMonth(ym.year, ym.month);

  useEffect(() => {
    if (needs.data) setVals(new Map(needs.data.cells.map((c) => [`${c.slotId}|${c.date}`, c.needed])));
  }, [needs.data]);

  const original = useMemo(() => new Set((needs.data?.cells ?? []).map((c) => `${c.slotId}|${c.date}`)), [needs.data]);
  if (!cat.data || !needs.data) return <p className="center">{cat.error ?? needs.error ?? t("loading")}</p>;
  const c = cat.data;
  const slots = sortSlots(c.slots.filter((s) => s.active), c);

  const save = async (confirm: boolean) => {
    const cells = [...vals.entries()]
      .filter(([k, v]) => v > 0 || original.has(k))
      .map(([k, needed]) => {
        const [slotId = "", date = ""] = k.split("|");
        return { slotId, date, needed };
      });
    try {
      await put(base, { cells, confirm });
      setMsg(confirm ? t("needs.confirmedMsg") : t("needs.saved"));
      await needs.reload();
    } catch (e) {
      setMsg(errMsg(e));
    }
  };

  const set = (k: string, v: number) => setVals(new Map(vals).set(k, Math.max(0, Math.min(50, v || 0))));

  return (
    <div>
      <PageHead
        title={t("needs.title")}
        meta={<span className={`badge ${needs.data.confirmed ? "published" : "draft"}`}>{needs.data.confirmed ? t("needs.confirmed") : t("needs.toConfirm")}</span>}
        actions={<MonthNav year={ym.year} month={ym.month} onChange={(y, m) => setYm({ year: y, month: m })} />}
      />
      <p className="muted">{t("needs.help")}</p>
      <div className="row" style={{ marginBottom: 10 }}>
        <button onClick={() => void save(false)}>{t("save")}</button>
        <button className="primary" onClick={() => void save(true)}>{t("needs.saveConfirm")}</button>
      </div>
      {msg && <p className="muted">{msg}</p>}
      <div className="scroll matrix">
        <table className="grid">
          <thead><tr><th className="sl">{t("grid.slot")}</th>{dates.map((d) => <th key={d}>{d.slice(8)}<br />{weekdayShort(weekdayIdx(d))}</th>)}</tr></thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.id}>
                <th className="sl">{slotLabel(s, c)}</th>
                {dates.map((d) => {
                  const k = `${s.id}|${d}`;
                  const v = vals.get(k) ?? 0;
                  const normal = s.weekdays.includes(weekdayIdx(d) + 1);
                  return (
                    <td key={d} className={v > 0 ? "complete" : normal ? "" : "off"} style={{ minWidth: 50 }}>
                      <input type="number" min={0} value={v || ""} placeholder="0" onChange={(e) => set(k, Number(e.target.value))} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
