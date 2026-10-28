import { useEffect, useState } from "react";
import { ApiError, del, get, patch, post } from "../api";
import { errMsg } from "../format";
import { useI18n } from "../i18n";
import { useConfirm } from "./ConfirmDialog";
import type { Candidate, OccurrenceView } from "../types";

interface Props { occ: OccurrenceView; onChanged: () => void | Promise<void> }

export const OccurrenceEditor = ({ occ, onChanged }: Props) => {
  const { t, violation } = useI18n();
  const confirm = useConfirm();
  const [cands, setCands] = useState<Candidate[]>([]);
  const [guideId, setGuideId] = useState("");
  const [note, setNote] = useState(occ.note ?? "");
  const [needed, setNeeded] = useState(occ.needed);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setNote(occ.note ?? "");
    setNeeded(occ.needed);
  }, [occ.id, occ.note, occ.needed]);

  const assignmentsKey = occ.assignments.map((a) => `${a.id}:${a.withdrawn}`).join(",");
  useEffect(() => {
    get<Candidate[]>(`/occurrences/${occ.id}/candidates`).then(setCands).catch(() => setCands([]));
  }, [occ.id, assignmentsKey, occ.status]);

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const add = () =>
    run(async () => {
      const c = cands.find((x) => x.guideId === guideId);
      if (!c) return;
      if (
        c.violations.length > 0 &&
        !(await confirm({
          title: t("occ.confirmTitle"),
          items: c.violations.map((v) => violation(v.code)),
          question: t("dlg.anyway"),
          confirmLabel: t("add"),
          tone: "warning",
        }))
      )
        return;
      try {
        await post(`/occurrences/${occ.id}/assignments`, { guideId, override: c.violations.length > 0 });
      } catch (e) {
        if (e instanceof ApiError && e.status === 409 && e.details?.violations) throw new Error(t("occ.violationRetry"));
        throw e;
      }
      setGuideId("");
    });

  const sorted = cands.filter((c) => showAll || c.violations.length === 0).sort((a, b) => a.violations.length - b.violations.length || a.name.localeCompare(b.name));

  return (
    <div>
      <p className="row">
        <span className={`badge ${occ.status === "NO_DEMAND" ? "" : occ.missing ? "draft" : "published"}`}>
          {occ.status === "NO_DEMAND" ? t("occ.nt") : occ.missing ? t("occ.missing", { n: occ.missing }) : t("occ.complete")}
        </span>
        <span className="muted">{t("occ.needed", { n: occ.needed })}</span>
      </p>
      <div className="list">
        {occ.assignments.length === 0 && <div className="muted">{t("occ.none")}</div>}
        {occ.assignments.map((a) => (
          <div key={a.id}>
            <div className="row end">
              <span className={a.withdrawn ? "nm w" : ""}>
                {a.guideName} {occ.status === "NO_DEMAND" && t("nt")} {a.source === "MANUAL" && <span className="muted">{t("occ.manual")}</span>}
                {a.confirmState === "CONFIRMED" && <span className="badge published" style={{ marginLeft: 6 }}>✓ {t("confirm.byGuide")}</span>}
                {a.confirmState === "PENDING" && <span className="badge draft" style={{ marginLeft: 6 }}>○ {t("confirm.pending")}</span>}
              </span>
              <span className="row">
                <button onClick={() => void run(() => patch(`/assignments/${a.id}`, { withdrawn: !a.withdrawn }))}>{a.withdrawn ? t("occ.restore") : t("occ.withdraw")}</button>
                <button className="danger" onClick={() => void run(() => del(`/assignments/${a.id}`))}>{t("remove")}</button>
              </span>
            </div>
            {a.warnings.map((w) => <div key={w.code} className="warnline">⚠ {violation(w.code)}</div>)}
          </div>
        ))}
      </div>
      {occ.status === "ACTIVE" && (
        <div className="row" style={{ marginTop: 10 }}>
          <select className="grow" value={guideId} onChange={(e) => setGuideId(e.target.value)}>
            <option value="">{t("occ.addGuide")}</option>
            {sorted.map((c) => (
              <option key={c.guideId} value={c.guideId}>{c.name}{c.violations.length ? ` ⚠ ${c.violations.map((v) => violation(v.code)).join(" · ")}` : ""}</option>
            ))}
          </select>
          <button className="primary" disabled={!guideId} onClick={() => void add()}>{t("add")}</button>
        </div>
      )}
      {occ.status === "ACTIVE" && (
        <div className="row" style={{ marginTop: 6 }}>
          <label className="row" style={{ flexDirection: "row", gap: 6 }}>
            <input type="checkbox" checked={showAll} onChange={(e) => { setShowAll(e.target.checked); setGuideId(""); }} />
            {t("occ.showAll")}
          </label>
        </div>
      )}
      <h2>{t("occ.stateNote")}</h2>
      <div className="row">
        {occ.status === "ACTIVE" && (
          <button className={occ.adminConfirmed ? "" : "blue"} onClick={() => void run(() => patch(`/occurrences/${occ.id}`, { adminConfirmed: !occ.adminConfirmed }))}>
            {occ.adminConfirmed ? t("ac.undo") : t("ac.confirm")}
          </button>
        )}
        <button onClick={() => void run(() => patch(`/occurrences/${occ.id}`, { status: occ.status === "ACTIVE" ? "NO_DEMAND" : "ACTIVE" }))}>
          {occ.status === "ACTIVE" ? t("occ.markNT") : t("occ.reactivate")}
        </button>
        <label>{t("occ.neededLabel")}
          <input type="number" min={0} style={{ width: 80 }} value={needed} onChange={(e) => setNeeded(Number(e.target.value))} onBlur={() => needed !== occ.needed && void run(() => patch(`/occurrences/${occ.id}`, { needed }))} />
        </label>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <input className="grow" placeholder={t("occ.notePh")} value={note} onChange={(e) => setNote(e.target.value)} />
        <button onClick={() => void run(() => patch(`/occurrences/${occ.id}`, { note: note.trim() || null }))}>{t("occ.saveNote")}</button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
};
