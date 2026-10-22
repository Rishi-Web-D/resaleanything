import "server-only";
import { cookies } from "next/headers";
import type { User } from "./types";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:4000";

export interface ApiResult<T> {
  status: number;
  ok: boolean;
  data: T;
}

/**
 * Server-side call to the Express API. Forwards the visitor's session cookie so the
 * backend can identify them. Always uncached: listings and sessions change constantly.
 */
export async function api<T>(path: string, opts: { auth?: boolean } = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  if (opts.auth) headers.cookie = (await cookies()).toString();
  const res = await fetch(BACKEND_URL + path, { cache: "no-store", headers });
  const data = (await res.json().catch(() => null)) as T;
  return { status: res.status, ok: res.ok, data };
}

export async function getUser(): Promise<User | null> {
  const r = await api<{ user: User | null }>("/api/auth/me", { auth: true });
  return r.ok ? r.data.user : null;
}

export function qs(params: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}
