import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { get, post } from "./api";
import type { Me } from "./types";

interface Ctx { me: Me | null; ready: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; refresh: () => Promise<void> }
const AuthCtx = createContext<Ctx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const refresh = async () => {
    try {
      setMe(await get<Me>("/auth/me"));
    } catch {
      setMe(null);
    }
    setReady(true);
  };
  useEffect(() => {
    void refresh();
  }, []);
  const login = async (email: string, password: string) => {
    setMe(await post<Me>("/auth/login", { email, password }));
  };
  const logout = async () => {
    await post("/auth/logout");
    setMe(null);
  };
  return <AuthCtx.Provider value={{ me, ready, login, logout, refresh }}>{children}</AuthCtx.Provider>;
};

export const useAuth = (): Ctx => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("AuthProvider em falta");
  return c;
};
