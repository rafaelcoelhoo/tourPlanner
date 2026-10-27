import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MonthNav } from "../components/MonthNav";
import { useCity } from "../city";
import { useI18n } from "../i18n";
import { useCatalog, useFetch } from "../hooks";
import type { GuideListItem, MonthView } from "../types";

const activeGuides = (guides: GuideListItem[]) => guides.filter((g) => g.status !== "DISABLED");

export const GuidesByGroup = ({ guides, by }: { guides: GuideListItem[]; by: "tour" | "language" }) => {
  const cat = useCatalog();
  const { t: tr, languageName } = useI18n();
  if (!cat.data) return <p className="center">{cat.error ?? tr("loading")}</p>;
  const c = cat.data;
  const people = activeGuides(guides);
  const outer = by === "tour" ? c.tours.filter((t) => t.active) : c.languages;
  const inner = by === "tour" ? c.languages : c.tours.filter((t) => t.active);
  const matches = (g: GuideListItem, o: string, i: string) =>
    g.qualifications.some((q) => (by === "tour" ? q.tourId === o && q.languageId === i : q.languageId === o && q.tourId === i));

  return (
    <div>
      {outer.map((o) => {
        const total = people.filter((g) => inner.some((i) => matches(g, o.id, i.id)));
        return (
          <div key={o.id} className="card">
            <div className="row end"><h2 style={{ margin: 0 }}>{"kind" in o ? `${o.name} · ${o.kind === "PRIMARY" ? tr("ov.primary") : tr("ov.secondary")}` : languageName(o.code, o.name)}</h2><span className="badge">{tr("ov.guidesCount", { n: total.length })}</span></div>
            {inner.map((i) => {
              const names = people.filter((g) => matches(g, o.id, i.id));
              return (
                <div key={i.id} style={{ marginTop: 8 }}>
                  <strong>{"code" in i ? languageName(i.code, i.name) : i.name}</strong> <span className="muted">({names.length})</span>
                  <div className="chips" style={{ marginTop: 4 }}>
                    {names.length === 0 && <span className="muted">—</span>}
                    {names.map((g) => <Link key={g.id} to={`/guias/${g.id}`} className="chip">{g.name}</Link>)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

const now = new Date();

export const GuidesLoad = ({ guides }: { guides: GuideListItem[] }) => {
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const { cityId } = useCity();
  const { t: tr } = useI18n();
  const cat = useCatalog();
  const month = useFetch<MonthView>(cityId ? `/cities/${cityId}/months/${ym.year}/${ym.month}` : null);
  const rows = useMemo(() => {
    if (!cat.data || !month.data) return [];
    const slotTour = new Map(cat.data.slots.map((s) => [s.id, s.tourId]));
    const occTour = new Map(month.data.occurrences.filter((o) => o.status === "ACTIVE").map((o) => [o.id, slotTour.get(o.slotId) ?? ""]));
    const perGuide = new Map<string, Map<string, number>>();
    for (const o of month.data.occurrences) {
      const tourId = occTour.get(o.id);
      if (!tourId) continue;
      for (const a of o.assignments) {
        if (a.withdrawn) continue;
        const m = perGuide.get(a.guideId) ?? new Map<string, number>();
        m.set(tourId, (m.get(tourId) ?? 0) + 1);
        perGuide.set(a.guideId, m);
      }
    }
    const stats = new Map(month.data.stats.map((s) => [s.guideId, s]));
    return activeGuides(guides)
      .filter((g) => g.status === "ACTIVE")
      .map((g) => ({ g, perTour: perGuide.get(g.id) ?? new Map<string, number>(), stat: stats.get(g.id) }))
      .sort((a, b) => a.g.name.localeCompare(b.g.name));
  }, [cat.data, month.data, guides]);

  if (!cat.data) return <p className="center">{cat.error ?? tr("loading")}</p>;
  const tours = cat.data.tours.filter((t) => t.active);
  const total = (r: (typeof rows)[number]) => (r.stat ? r.stat.primary + r.stat.secondary : 0);

  return (
    <div>
      <div className="row end" style={{ marginBottom: 8 }}>
        <MonthNav year={ym.year} month={ym.month} onChange={(y, m) => setYm({ year: y, month: m })} />
        {month.data && <span className="badge">{month.data.status === "PUBLISHED" ? tr("status.published") : month.data.status === "DRAFT" ? tr("status.draft") : tr("status.noDraft")}</span>}
      </div>
      <p className="muted">{tr("ov.loadHelp")}</p>
      {month.error && <p className="error">{month.error}</p>}
      <div className="scroll">
        <table className="grid">
          <thead>
            <tr>
              <th className="sl">{tr("stats.guide")}</th>
              {tours.map((t) => <th key={t.id}>{t.name}</th>)}
              <th>{tr("stats.total")}</th><th>{tr("stats.availableDays")}</th><th>{tr("stats.ratio")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.g.id}>
                <th className="sl"><Link to={`/guias/${r.g.id}`}>{r.g.name}</Link></th>
                {tours.map((t) => <td key={t.id}>{r.perTour.get(t.id) ?? 0}</td>)}
                <td><strong>{total(r)}</strong></td>
                <td>{r.stat?.availableDays ?? "—"}</td>
                <td>{r.stat ? r.stat.ratio.toFixed(2) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
