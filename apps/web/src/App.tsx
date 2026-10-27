import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { useCity } from "./city";
import { LanguageSelect, useI18n, type Key } from "./i18n";
import { Login, Activate } from "./pages/Login";
import { GridPage } from "./pages/Grid";
import { NeedsPage } from "./pages/Needs";
import { DayPage } from "./pages/Day";
import { GuidesPage } from "./pages/Guides";
import { SlotsPage } from "./pages/Slots";
import { ProfilePage } from "./pages/Profile";
import { MySchedule } from "./pages/MySchedule";

const Layout = () => {
  const { me, logout } = useAuth();
  const { cities, cityId, city, setCityId } = useCity();
  const { t } = useI18n();
  if (!me) return <Navigate to="/login" replace />;
  const admin = me.role === "ADMIN";
  const links: [string, Key][] = admin
    ? [["/grelha", "nav.schedule"], ["/dia", "nav.day"], ["/necessidades", "nav.matrix"], ["/guias", "nav.guides"], ["/slots", "nav.slots"]]
    : [["/horario", "nav.schedule"], ["/perfil", "nav.profile"]];
  return (
    <div className="app">
      <div className="topwrap">
      <header className="top">
        <strong>{t("appName")}</strong>
        {admin ? (
          <select value={cityId ?? ""} onChange={(e) => setCityId(e.target.value)} aria-label={t("cityAria")}>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : (
          city && <span className="badge">{city.name}</span>
        )}
        <span className="muted">{me.name}</span>
        <LanguageSelect />
        <button className="link" onClick={() => void logout()}>{t("logout")}</button>
      </header>
      <nav className="tabs">
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>{t(label)}</NavLink>
        ))}
      </nav>
      </div>
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
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        {admin ? (
          <>
            <Route path="/grelha" element={<GridPage />} />
            <Route path="/dia" element={<DayPage />} />
            <Route path="/necessidades" element={<NeedsPage />} />
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
