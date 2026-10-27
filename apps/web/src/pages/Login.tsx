import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { get, post } from "../api";
import { useAuth } from "../auth";
import { errMsg } from "../format";
import { LanguageSelect, useI18n } from "../i18n";

export const Login = () => {
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      setError(errMsg(err));
    }
  };
  return (
    <form className="card narrow" onSubmit={(e) => void submit(e)}>
      <div className="row end"><h1>{t("login.title")}</h1><LanguageSelect /></div>
      <label>{t("login.email")}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></label>
      <label>{t("login.password")}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
      {error && <p className="error">{error}</p>}
      <button className="primary">{t("login.submit")}</button>
      <Link to="/recuperar" className="muted">{t("login.forgot")}</Link>
    </form>
  );
};

export const Activate = () => {
  const { token = "" } = useParams();
  const { refresh } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [info, setInfo] = useState<{ name: string; email: string } | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    get<{ name: string; email: string }>(`/auth/invite/${token}`).then(setInfo).catch((e: unknown) => setError(errMsg(e)));
  }, [token]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await post("/auth/activate", { token, password });
      await refresh();
      nav("/");
    } catch (err) {
      setError(errMsg(err));
    }
  };
  return (
    <form className="card narrow" onSubmit={(e) => void submit(e)}>
      <div className="row end"><h1>{t("activate.title")}</h1><LanguageSelect /></div>
      {info && <p>{t("activate.hello", { name: info.name, email: info.email })}</p>}
      {info && <label>{t("activate.password")}<input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" /></label>}
      {error && <p className="error">{error}</p>}
      {info && <button className="primary">{t("activate.submit")}</button>}
    </form>
  );
};

export const Forgot = () => {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await post("/auth/forgot", { email });
      setSent(true);
      setError("");
    } catch (err) {
      setError(errMsg(err));
    }
  };
  return (
    <form className="card narrow" onSubmit={(e) => void submit(e)}>
      <div className="row end"><h1>{t("forgot.title")}</h1><LanguageSelect /></div>
      <p className="muted">{t("forgot.help")}</p>
      <label>{t("login.email")}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></label>
      {sent && <p className="ok">{t("forgot.sent")}</p>}
      {error && <p className="error">{error}</p>}
      <button className="primary">{t("forgot.send")}</button>
      <Link to="/login" className="muted">{t("forgot.back")}</Link>
    </form>
  );
};

export const ResetPassword = () => {
  const { token = "" } = useParams();
  const { refresh } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [info, setInfo] = useState<{ name: string } | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    get<{ name: string }>(`/auth/reset/${token}`).then(setInfo).catch((e: unknown) => setError(errMsg(e)));
  }, [token]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await post("/auth/reset", { token, password });
      await refresh();
      nav("/");
    } catch (err) {
      setError(errMsg(err));
    }
  };
  return (
    <form className="card narrow" onSubmit={(e) => void submit(e)}>
      <div className="row end"><h1>{t("reset.title")}</h1><LanguageSelect /></div>
      {info && <p>{t("reset.hello", { name: info.name })}</p>}
      {info && <label>{t("activate.password")}<input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" /></label>}
      {error && <p className="error">{error}</p>}
      {info && <button className="primary">{t("reset.submit")}</button>}
      {!info && <Link to="/recuperar" className="muted">{t("login.forgot")}</Link>}
    </form>
  );
};
