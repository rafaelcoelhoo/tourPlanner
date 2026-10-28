import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import { useCity } from "./city";
import { LanguageSelect, useI18n, type Key } from "./i18n";
import { Login, Activate, Forgot, ResetPassword } from "./pages/Login";
import { GridPage } from "./pages/Grid";
import { NeedsPage } from "./pages/Needs";
import { DayPage } from "./pages/Day";
import { GuidesPage } from "./pages/Guides";
import { LoadPage } from "./pages/Load";
import { SlotsPage } from "./pages/Slots";
import { ProfilePage } from "./pages/Profile";
import { MySchedule } from "./pages/MySchedule";

const Layout = () => {
  const { me, logout } = useAuth();
  const { cities, cityId, city, setCityId } = useCity();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  if (!me) return <Navigate to="/login" replace />;
  const admin = me.role === "ADMIN";
  const links: [string, Key][] = admin
    ? [["/grelha", "nav.schedule"], ["/dia", "nav.day"], ["/necessidades", "nav.matrix"], ["/carga", "nav.load"], ["/guias", "nav.guides"], ["/slots", "nav.slots"]]
    : [["/horario", "nav.schedule"], ["/perfil", "nav.profile"]];
  const navLinks = links.map(([to, label]) => (
    <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>{t(label)}</NavLink>
  ));
  const account = (
    <>
      <span className="muted">{me.name}</span>
      <LanguageSelect />
      <button className="link" onClick={() => void logout()}>{t("logout")}</button>
    </>
  );
  return (
    <div className="app">
      <div className="topwrap">
      <header className="top">
        <button className="menu-btn" aria-label={menuOpen ? t("menu.close") : t("menu.open")} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span /><span />
        </button>
        <strong>{t("appName")}</strong>
        {admin ? (
          <select value={cityId ?? ""} onChange={(e) => setCityId(e.target.value)} aria-label={t("cityAria")}>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : (
          city && <span className="badge">{city.name}</span>
        )}
        <div className="account desktop-only">{account}</div>
      </header>
      <nav className="tabs desktop-only">{navLinks}</nav>
      </div>
      {menuOpen && <div className="drawer-bg" onClick={() => setMenuOpen(false)} />}
      <nav className={`drawer ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <button className="drawer-close" aria-label={t("menu.close")} onClick={() => setMenuOpen(false)}>✕</button>
        <div className="drawer-links">{navLinks}</div>
        <div className="drawer-account">{account}</div>
      </nav>
      <main><Outlet /></main>
    </div>
  );
};

const Home = () => {
  const { me } = useAuth();
  return <Navigate to={me?.role === "ADMIN" ? "/grelha" : "/horario"} replace />;
};

export const App = () => {
  const { ready, me } = useAuth();
  const { t } = useI18n();
  if (!ready) return <p className="center">{t("loading")}</p>;
  const admin = me?.role === "ADMIN";
  return (
    <Routes>
      <Route path="/login" element={me ? <Home /> : <Login />} />
      <Route path="/ativar/:token" element={<Activate />} />
      <Route path="/recuperar" element={<Forgot />} />
      <Route path="/redefinir/:token" element={<ResetPassword />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        {admin ? (
          <>
            <Route path="/grelha" element={<GridPage />} />
            <Route path="/dia" element={<DayPage />} />
            <Route path="/necessidades" element={<NeedsPage />} />
            <Route path="/carga" element={<LoadPage />} />
            <Route path="/guias" element={<GuidesPage />} />
            <Route path="/guias/:id" element={<ProfilePage />} />
            <Route path="/slots" element={<SlotsPage />} />
          </>
        ) : (
          <>
            <Route path="/horario" element={<MySchedule />} />
            <Route path="/perfil" element={<ProfilePage />} />
          </>
        )}
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
};
