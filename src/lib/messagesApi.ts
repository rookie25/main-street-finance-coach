// In-platform messaging API — shared by Client Portal and EA Portal.
// Backend endpoints: POST/GET /client/messages, PATCH /client/messages/read,
//                   POST/GET /ea/client/{schema}/messages, PATCH /ea/client/{schema}/messages/read
import { supabase } from "@/lib/supabase";

const BASE = (import.meta.env.VITE_RAILWAY_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export interface Message {
  id:            string;
  client_schema: string;
  sender_role:   "client" | "ea";
  sender_id:     string;
  body:          string;
  read_at:       string | null;
  created_at:    string;
}

export interface MessagesResponse {
  schema:   string;
  messages: Message[];
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function clientAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function _fetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await clientAuthHeader();
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

// ── Client Portal ────────────────────────────────────────────────────────────

export async function clientGetMessages(): Promise<MessagesResponse> {
  return _fetch<MessagesResponse>("/client/messages");
}

export async function clientSendMessage(body: string): Promise<Message> {
  return _fetch<Message>("/client/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}

export async function clientMarkRead(): Promise<void> {
  await _fetch("/client/messages/read", { method: "PATCH" });
}

// ── EA Portal ────────────────────────────────────────────────────────────────

export async function eaGetMessages(schema: string): Promise<MessagesResponse> {
  return _fetch<MessagesResponse>(`/ea/client/${encodeURIComponent(schema)}/messages`);
}

export async function eaSendMessage(schema: string, body: string): Promise<Message> {
  return _fetch<Message>(`/ea/client/${encodeURIComponent(schema)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}

export async function eaMarkRead(schema: string): Promise<void> {
  await _fetch(`/ea/client/${encodeURIComponent(schema)}/messages/read`, { method: "PATCH" });
}

// ── Supabase direct — unread counts (RLS filters automatically) ───────────────

/** Client portal: number of unread EA messages. RLS restricts to this client's schema. */
export async function getClientUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("sender_role", "ea")
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

/** EA portal: unread client-message counts keyed by client_schema. */
export async function getEAUnreadCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("messages")
    .select("client_schema")
    .eq("sender_role", "client")
    .is("read_at", null);
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data) {
    const s = row.client_schema as string;
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}
