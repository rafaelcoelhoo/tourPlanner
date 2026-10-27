import { useCallback, useEffect, useState } from "react";
import { get } from "./api";
import { useCity } from "./city";
import type { Catalog } from "./types";

export const useFetch = <T,>(path: string | null) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await get<T>(path));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    setData(null);
    setLoading(true);
    void reload();
  }, [reload]);
  return { data, error, loading, reload };
};

/** Sem argumento usa a cidade selecionada; `null` adia o pedido (cidade ainda desconhecida). */
export const useCatalog = (cityId?: string | null) => {
  const ctx = useCity();
  const id = cityId === undefined ? ctx.cityId : cityId;
  return useFetch<Catalog>(id ? `/catalog?cityId=${id}` : null);
};
