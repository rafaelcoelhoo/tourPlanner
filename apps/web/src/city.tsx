import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { get } from "./api";
import { useAuth } from "./auth";
import { currentYm } from "./format";
import type { City } from "./types";

interface Ctx {
  cities: City[];
  cityId: string | null;
  city: City | null;
  setCityId: (id: string) => void;
  reloadCities: () => Promise<void>;
  ym: { year: number; month: number };
  setYm: (ym: { year: number; month: number }) => void;
}
const CityCtx = createContext<Ctx | null>(null);
const KEY = "cityId";

export const CityProvider = ({ children }: { children: ReactNode }) => {
  const { me } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [picked, setPicked] = useState<string | null>(() => localStorage.getItem(KEY));
  const [ym, setYm] = useState<{ year: number; month: number }>(() => currentYm());
  const reloadCities = useCallback(async () => setCities(await get<City[]>("/cities")), []);
  useEffect(() => {
    if (me) void reloadCities();
  }, [me, reloadCities]);

  // O guia está sempre limitado à sua cidade; o admin escolhe (guardado no browser).
  const cityId = me?.role === "GUIDE" ? me.cityId : cities.find((c) => c.id === picked)?.id ?? cities[0]?.id ?? null;
  const setCityId = (id: string) => {
    localStorage.setItem(KEY, id);
    setPicked(id);
  };
  const city = cities.find((c) => c.id === cityId) ?? null;
  return <CityCtx.Provider value={{ cities, cityId, city, setCityId, reloadCities, ym, setYm }}>{children}</CityCtx.Provider>;
};

export const useCity = (): Ctx => {
  const c = useContext(CityCtx);
  if (!c) throw new Error("CityProvider em falta");
  return c;
};
