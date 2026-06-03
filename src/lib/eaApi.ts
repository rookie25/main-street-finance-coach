// Client for the FastAPI EA backend (groundstack on Railway) — the financial
// READ side: client list + status, available report months, and signed PDF URLs.
// Every request carries the EA's Supabase access token as a Bearer header; the
// backend validates it and confirms EA-roster membership.
//
// EA WRITES (flags/approvals/overrides/notes) do NOT go here — see eaData.ts,
// which talks to Supabase directly under RLS.
import { supabase } from "@/lib/supabase";

const BASE = (import.meta.env.VITE_RAILWAY_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export interface EAClient {
  client_schema:     string;
  business_name:     string;
  onboarding_status: string | null;
  status:            "active" | "pending";
  pending_count:     number;
}

export interface EAMonths {
  client_schema: string;
  months: string[]; // 'YYYY-MM', newest first
}

export interface PnlLinks {
  client_schema: string;
  month: string;
  pnl_pdf_url: string;
  balance_sheet_pdf_url: string | null;
  expires_in: number;
}

export interface EAProfile {
  id: string;
  email: string;
  name: string | null;
}

export class ApiError extends Error {
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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { ...(await authHeader()) } });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

export const getMe = () => get<EAProfile>("/ea/me");
export const listClients = () => get<EAClient[]>("/ea/clients");

export const getClientMonths = (schema: string) =>
  get<EAMonths>(`/ea/client/${encodeURIComponent(schema)}/months`);

export const getClientPnl = (schema: string, month: string) =>
  get<PnlLinks>(`/ea/client/${encodeURIComponent(schema)}/pnl?month=${encodeURIComponent(month)}`);

// Supabase signed URLs accept an appended `download` param to force a
// content-disposition attachment without invalidating the signature.
export const asDownloadUrl = (signedUrl: string, filename: string) =>
  `${signedUrl}&download=${encodeURIComponent(filename)}`;

// ── Pending adjustments ───────────────────────────────────────────────────────

export interface PendingExpense {
  id:       string;
  vendor:   string;
  amount:   number;
  date:     string;
  category: string | null;
}

export interface PendingAdjustment {
  id:           string;
  client_schema: string;
  expense_id:   string;
  request_type: "amount_change" | "delete";
  old_value:    { vendor: string; amount: number; date: string; category: string | null } | null;
  new_value:    { amount: number } | null;
  client_note:  string | null;
  status:       "pending" | "approved" | "rejected";
  submitted_at: string;
  expense:      PendingExpense | null;
}

export interface PendingAdjustmentsData {
  client_schema: string;
  adjustments:   PendingAdjustment[];
  total:         number;
}

export const getPendingAdjustments = (schema: string) =>
  get<PendingAdjustmentsData>(`/ea/pending-adjustments/${encodeURIComponent(schema)}`);

export const approveAdjustment = (adjId: string, amount?: number) =>
  post<{ approved: boolean; adj_id: string; request_type: string }>(
    `/ea/pending-adjustments/${encodeURIComponent(adjId)}/approve`,
    amount !== undefined ? { amount } : {},
  );

export const rejectAdjustment = (adjId: string) =>
  post<{ rejected: boolean; adj_id: string }>(
    `/ea/pending-adjustments/${encodeURIComponent(adjId)}/reject`,
    {},
  );

async function post<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method:  "POST",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { /* */ }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}
