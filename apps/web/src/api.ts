import { currentLang } from "./i18n";

export interface PublishCheck {
  warningCount: number;
  missingTotal: number;
  warnings: { date: string; slotId: string; guideName: string; codes: string[] }[];
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: { violations?: { code: string; message: string }[]; publishCheck?: PublishCheck }) {
    super(message);
  }
}

export const api = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: { "x-lang": currentLang(), ...(body !== undefined ? { "content-type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data as { error?: string; details?: ApiError["details"] };
    throw new ApiError(d.error ?? "Error", res.status, d.details);
  }
  return data as T;
};
export const get = <T,>(p: string) => api<T>("GET", p);
export const post = <T,>(p: string, b: unknown = {}) => api<T>("POST", p, b);
export const put = <T,>(p: string, b: unknown) => api<T>("PUT", p, b);
export const patch = <T,>(p: string, b: unknown) => api<T>("PATCH", p, b);
export const del = <T,>(p: string) => api<T>("DELETE", p);
