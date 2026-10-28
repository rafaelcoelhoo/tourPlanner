import { useState, type FormEvent } from "react";
import { post } from "../api";
import { errMsg } from "../format";
import { useI18n } from "../i18n";

/** Cartão "Alterar palavra-passe" (guia no seu perfil e admin na sua conta). */
export const PasswordCard = () => {
  const { t } = useI18n();
  const [pw, setPw] = useState({ current: "", next: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await post("/auth/password", pw);
      setPw({ current: "", next: "" });
      setMsg({ ok: true, text: t("pw.done") });
    } catch (err) {
      setMsg({ ok: false, text: errMsg(err) });
    }
  };
  return (
    <form className="card" onSubmit={(e) => void submit(e)}>
      <h2>{t("pw.title")}</h2>
      <div className="row">
        <label>{t("pw.current")}<input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required autoComplete="current-password" /></label>
        <label>{t("pw.next")}<input type="password" minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required autoComplete="new-password" /></label>
        <button className="primary">{t("pw.submit")}</button>
      </div>
      {msg && <p className={msg.ok ? "ok" : "error"} role="status">{msg.text}</p>}
    </form>
  );
};
