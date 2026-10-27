import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { patch, post } from "../api";
import { useCity } from "../city";
import { useCatalog, useFetch } from "../hooks";
import { errMsg } from "../format";
import { useI18n } from "../i18n";
import { GuidesByGroup, GuidesLoad } from "./GuidesOverview";
import type { GuideListItem } from "../types";

export const GuidesPage = () => {
  const { cityId, city, cities } = useCity();
  const { t } = useI18n();
  const cat = useCatalog();
  const hasSecondary = cat.data?.tours.some((t) => t.active && t.kind === "SECONDARY") ?? false;
  const guides = useFetch<GuideListItem[]>(cityId ? `/guides?cityId=${cityId}` : null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", inviteCity: "" });
  const [link, setLink] = useState<{ name: string; url: string } | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"list" | "tour" | "language" | "load">("list");

  const create = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const target = form.inviteCity || cityId;
      const { inviteCity: _ignored, ...rest } = form;
      const r = await post<{ inviteLink: string }>("/guides", { ...rest, cityId: target, phone: form.phone || undefined });
      setLink({ name: `${form.name} (${cities.find((c) => c.id === target)?.name ?? ""})`, url: r.inviteLink });
      setForm({ name: "", email: "", phone: "", inviteCity: "" });
      setError("");
      await guides.reload();
    } catch (err) {
      setError(errMsg(err));
    }
  };
  const reinvite = async (g: GuideListItem) => {
    const r = await post<{ inviteLink: string }>(`/guides/${g.id}/invite`);
    setLink({ name: g.name, url: r.inviteLink });
  };
  const toggle = async (g: GuideListItem) => {
    try {
      await patch(`/guides/${g.id}`, { status: g.status === "DISABLED" ? "ACTIVE" : "DISABLED" });
      await guides.reload();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <div>
      <h1>{t("guides.title")}{city ? ` · ${city.name}` : ""}</h1>
      <form className="card row" onSubmit={(e) => void create(e)}>
        <input placeholder={t("guides.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input type="email" placeholder={t("guides.email")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input placeholder={t("guides.phoneOpt")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <select value={form.inviteCity || cityId || ""} onChange={(e) => setForm({ ...form, inviteCity: e.target.value })} required aria-label={t("guides.cityAria")}>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="primary">{t("guides.invite")}</button>
      </form>
      {error && <p className="error">{error}</p>}
      {link && (
        <div className="card">
          <p>{t("guides.linkFor", { name: link.name })}</p>
          <input readOnly value={link.url} style={{ width: "100%" }} onFocus={(e) => e.target.select()} />
          <button onClick={() => void navigator.clipboard.writeText(link.url)}>{t("copy")}</button>
        </div>
      )}
      <div className="chips" style={{ marginBottom: 10 }}>
        {([["list", t("guides.tabList")], ["tour", t("guides.tabTour")], ["language", t("guides.tabLanguage")], ["load", t("guides.tabLoad")]] as const).map(([k, l]) => (
          <button key={k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === "tour" && guides.data && <GuidesByGroup guides={guides.data} by="tour" />}
      {tab === "language" && guides.data && <GuidesByGroup guides={guides.data} by="language" />}
      {tab === "load" && guides.data && <GuidesLoad guides={guides.data} />}
      {tab === "list" && <div className="card list">
        {guides.data?.map((g) => (
          <div key={g.id} className="row end">
            <div>
              <Link to={`/guias/${g.id}`}><strong>{g.name}</strong></Link>
              <div className="muted">{g.email} · {t("guides.qualCount", { n: g.qualificationCount })}</div>
              {hasSecondary && g.status !== "INVITED" && g.secondaryCount === 0 && <div className="warnline">{t("guides.noSecondary")}</div>}
            </div>
            <div className="row">
              <span className="badge">{t(`guides.${g.status}`)}</span>
              {g.status === "INVITED" && <button onClick={() => void reinvite(g)}>{t("guides.newLink")}</button>}
              {g.status !== "INVITED" && <button onClick={() => void toggle(g)}>{g.status === "DISABLED" ? t("guides.activate") : t("guides.deactivate")}</button>}
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
};
