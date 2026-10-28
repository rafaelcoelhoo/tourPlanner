import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n";

export interface ConfirmOptions {
  title: string;
  message?: string;
  badges?: string[];
  items?: string[];
  question?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "warning";
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;
const ConfirmCtx = createContext<ConfirmFn | null>(null);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useI18n();
  const [state, setState] = useState<{ opts: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((opts) => new Promise<boolean>((resolve) => setState({ opts, resolve })), []);
  const close = useCallback(
    (ok: boolean) => {
      state?.resolve(ok);
      setState(null);
    },
    [state],
  );

  useEffect(() => {
    if (!state) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close]);

  const o = state?.opts;
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {o && (
        <div className="dialog-bg" onClick={() => close(false)}>
          <div className={`dialog ${o.tone ?? "default"}`} role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="dlg-title">{o.title}</h2>
            {o.message && <p>{o.message}</p>}
            {o.badges && o.badges.length > 0 && (
              <div className="chips" style={{ marginBottom: 10 }}>
                {o.badges.map((b) => <span key={b} className="badge draft">{b}</span>)}
              </div>
            )}
            {o.items && o.items.length > 0 && (
              <ul className="dlg-list">
                {o.items.map((i, idx) => <li key={idx}>{i}</li>)}
              </ul>
            )}
            {o.question && <p><strong>{o.question}</strong></p>}
            <div className="dlg-actions">
              <button onClick={() => close(false)}>{o.cancelLabel ?? t("cancel")}</button>
              <button ref={confirmRef} className="primary" onClick={() => close(true)}>{o.confirmLabel ?? t("dlg.continue")}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
};

export const useConfirm = (): ConfirmFn => {
  const c = useContext(ConfirmCtx);
  if (!c) throw new Error("ConfirmProvider em falta");
  return c;
};
