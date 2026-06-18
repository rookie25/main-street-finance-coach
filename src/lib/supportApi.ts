// Tech-support chat API (client + EA portals). Backend endpoints:
//   GET/POST /client/support     (client portal)
//   GET/POST /ea/support         (EA portal)
// The support_messages table is backend-mediated only (RLS revokes anon), so —
// unlike the EA<->client `messages` table — there is no Supabase-direct path here.
import { supabase } from "@/lib/supabase";

const BASE = (import.meta.env.VITE_RAILWAY_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export interface SupportMessage {
  id:         string;
  sender:     "user" | "support";
  body:       string;
  created_at: string;
}

export interface SupportResponse {
  messages: SupportMessage[];
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function _fetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeader();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { /* noop */ }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

// ── Client portal ──────────────────────────────────────────────────────────
export async function clientGetSupport(): Promise<SupportResponse> {
  return _fetch<SupportResponse>("/client/support");
}

export async function clientSendSupport(body: string): Promise<SupportMessage> {
  return _fetch<SupportMessage>("/client/support", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}

// ── EA portal ──────────────────────────────────────────────────────────────
export async function eaGetSupport(): Promise<SupportResponse> {
  return _fetch<SupportResponse>("/ea/support");
}

export async function eaSendSupport(body: string): Promise<SupportMessage> {
  return _fetch<SupportMessage>("/ea/support", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}
