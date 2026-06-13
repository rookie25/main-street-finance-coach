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

export interface EAProfileData {
  full_name:     string | null;
  firm_name:     string | null;
  email:         string;
  member_since:  string | null;
  clients: Array<{
    business_name: string;
    schema_name:   string;
    is_active:     boolean;
    assigned_at:   string | null;
  }>;
}

export interface EAProfileUpdate {
  full_name: string;
  firm_name: string;
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

export const getClientMonths = (schema: string, start?: string, end?: string) => {
  const params = start && end
    ? `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    : "";
  return get<EAMonths>(`/ea/client/${encodeURIComponent(schema)}/months${params}`);
};

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

async function patch<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method:  "PATCH",
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

export const getProfile = () => get<EAProfileData>("/ea/profile");
export const updateProfile = (data: EAProfileUpdate) =>
  patch<{ ok: boolean; full_name: string; firm_name: string | null }>("/ea/profile", data);

export interface ClientSummary {
  schema_name:  string;
  net_revenue:  number | null;
  net_income:   number | null;
  last_sync:    string | null;
}

export const getClientsSummary = () => get<ClientSummary[]>("/ea/clients/summary");

export interface ClientAlert {
  type:  "report" | "tax";
  label: string;
  color: "green" | "amber" | "red";
}

export interface ClientAlertsData {
  schema_name: string;
  alerts:      ClientAlert[];
}

export const getClientsAlerts = () => get<ClientAlertsData[]>("/ea/clients/alerts");

// ── Document sharing (client <-> CPA) ─────────────────────────────────────────
export interface EASharedDocument {
  id:           string;
  from:         "client" | "you";
  filename:     string | null;
  content_type: string | null;
  size_bytes:   number | null;
  note:         string | null;
  created_at:   string | null;
  download_url: string | null;
}

export const getClientDocuments = (schema: string) =>
  get<{ documents: EASharedDocument[]; total: number }>(`/ea/clients/${encodeURIComponent(schema)}/documents`);

export async function shareDocumentToClient(schema: string, file: File, note: string): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  if (note) form.append("note", note);
  const res = await fetch(`${BASE}/ea/clients/${encodeURIComponent(schema)}/documents/share`, {
    method:  "POST",
    headers: await authHeader(),
    body:    form,
  });
  if (!res.ok) throw new ApiError(`Upload failed (${res.status})`, res.status);
}

// ── QuickBooks export ─────────────────────────────────────────────────────────
export async function downloadQuickBooks(schema: string, month: string): Promise<void> {
  const res = await fetch(
    `${BASE}/ea/clients/${encodeURIComponent(schema)}/quickbooks-export?month=${encodeURIComponent(month)}`,
    { headers: await authHeader() },
  );
  if (!res.ok) throw new ApiError(`Export failed (${res.status})`, res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${schema}_${month}_quickbooks.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Accounts receivable (client's invoices) ──────────────────────────────────
export interface EAReceivable {
  invoice_number: string;
  customer:       string;
  customer_email: string | null;
  amount:         number;
  status:         "draft" | "sent" | "paid" | "overdue" | "void";
  issue_date:     string | null;
  due_date:       string | null;
  paid_at:        string | null;
  days_overdue:   number | null;
}

export interface EAReceivablesData {
  summary: {
    outstanding:   number;
    overdue:       number;
    paid:          number;
    draft:         number;
    open_count:    number;
    overdue_count: number;
    count:         number;
  };
  invoices: EAReceivable[];
}

export const getClientReceivables = (schema: string) =>
  get<EAReceivablesData>(`/ea/clients/${encodeURIComponent(schema)}/accounts-receivable`);

// ── Worksheet ─────────────────────────────────────────────────────────────────

export interface PLCategoryRow {
  key:         string;
  label:       string;
  amount:      number;
  base_amount: number;
  is_adjusted: boolean;
  adj_id:      string | null;
}

export interface BSItem {
  id:          string;
  label:       string;
  amount:      number;
  note:        string;
  is_adjusted: boolean;
}

export interface WorksheetData {
  schema: string;
  period: string;
  pl: {
    revenue_lines:   PLCategoryRow[];
    tax_collected:   { amount: number; is_adjusted: boolean };
    cogs_categories: PLCategoryRow[];
    opex_categories: PLCategoryRow[];
    revenue_gross:   number;
    net_revenue:     number;
    cogs_total:      number;
    gross_profit:    number;
    opex_total:      number;
    net_income:      number;
  };
  bs: {
    assets:            { current: BSItem[]; fixed: BSItem[]; total_current: number; total_fixed: number; total: number };
    liabilities:       { items: BSItem[]; total: number };
    equity:            { items: BSItem[]; total: number };
    total_liab_equity: number;
    balanced:          boolean;
  };
  adjustments: unknown[];
}

export interface AdjustPayload {
  period:         string;
  sheet_type:     "pl" | "bs";
  expense_id?:    string | null;
  field_changed:  string;
  original_value?: string;
  new_value:      string;
  note?:          string;
}

export const getWorksheet = (schema: string, month: string) =>
  get<WorksheetData>(`/ea/client/${encodeURIComponent(schema)}/worksheet?month=${encodeURIComponent(month)}`);

export async function saveAdjustment(schema: string, payload: AdjustPayload): Promise<unknown> {
  const res = await fetch(`${BASE}/ea/client/${encodeURIComponent(schema)}/worksheet/adjust`, {
    method:  "POST",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = `Save failed (${res.status})`;
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { /* */ }
    throw new ApiError(detail, res.status);
  }
  return res.json();
}

export async function resetAdjustments(schema: string, month: string): Promise<void> {
  const res = await fetch(
    `${BASE}/ea/client/${encodeURIComponent(schema)}/worksheet/adjustments?month=${encodeURIComponent(month)}`,
    { method: "DELETE", headers: await authHeader() },
  );
  if (!res.ok) throw new ApiError(`Reset failed (${res.status})`, res.status);
}

export const worksheetExportUrl = (schema: string, month: string) =>
  `${BASE}/ea/client/${encodeURIComponent(schema)}/worksheet/export?month=${encodeURIComponent(month)}`;

// ── Flags ─────────────────────────────────────────────────────────────────────
// Fetched via backend (not direct Supabase) because monthly_expenses has
// is_client_schema() RLS — the EA's JWT cannot join it directly.

export interface EAFlagExpense {
  id:          string;
  vendor:      string | null;
  amount:      number | null;
  date:        string | null;
  pl_category: string | null;
}

export interface EAFlagEnriched {
  id:           number;
  client_schema: string;
  month:        string;
  line_item_id: string;
  flag_note:    string;
  flagged_by:   string;
  resolved:     boolean;
  resolved_by:  string | null;
  resolved_at:  string | null;
  created_at:   string;
  expense:      EAFlagExpense | null;
}

export const getEAFlags = (schema: string, month: string) =>
  get<{ flags: EAFlagEnriched[] }>(
    `/ea/client/${encodeURIComponent(schema)}/flags?month=${encodeURIComponent(month)}`,
  );

// ── Monthly verification flags ────────────────────────────────────────────────

export interface VerificationFlag {
  id:         number;
  severity:   "error" | "warning" | "info";
  check_name: string;
  message:    string;
  amount:     number;
  resolved:   boolean;
  created_at: string;
}

export interface VerificationResult {
  schema:        string;
  period:        string;
  error_count:   number;
  warning_count: number;
  info_count:    number;
  has_blockers:  boolean;
  flags:         VerificationFlag[];
}

export const getVerificationFlags = (schema: string, period: string) =>
  get<VerificationResult>(
    `/ea/client/${encodeURIComponent(schema)}/verification?period=${encodeURIComponent(period)}`,
  );

export const resolveVerificationFlag = (schema: string, flagId: number) =>
  patch<{ ok: boolean }>(
    `/ea/client/${encodeURIComponent(schema)}/verification/${flagId}/resolve`,
    {},
  );

// ── Month approval (via backend so email fires on approval) ──────────────────

export interface EAApprovalRow {
  id:            number;
  client_schema: string;
  month:         string;
  approved_by:   string;
  approved_at:   string;
  notes:         string | null;
}

export const approveMonthViaBackend = (schema: string, month: string, notes?: string) =>
  post<EAApprovalRow>(
    `/ea/client/${encodeURIComponent(schema)}/approve-month`,
    { month, notes: notes ?? null },
  );

// ── Categorization review (#9 Phase 2) ───────────────────────────────────────

export interface CategorizationGroup {
  raw_merchant:     string | null;
  vendor:           string | null;
  current_category: string | null;
  category_source:  string | null;
  total_amount:     number;
  count:            number;
  expense_ids:      string[];
}

export interface CategorizationReview {
  period:     string;
  categories: string[];
  groups:     CategorizationGroup[];
  note?:      string;
}

export const getCategorizationReview = (schema: string, period: string) =>
  get<CategorizationReview>(
    `/ea/client/${encodeURIComponent(schema)}/categorization-review?period=${encodeURIComponent(period)}`,
  );

export interface ApplyCategorizationPayload {
  period:            string;
  pl_category:       string;
  raw_merchant?:     string;
  merchant_pattern?: string;
  expense_ids?:      string[];
  create_rule?:      boolean;
}

export const applyCategorization = (schema: string, body: ApplyCategorizationPayload) =>
  post<{ ok: boolean; updated_rows: number; rule_created: boolean; pl_category: string }>(
    `/ea/client/${encodeURIComponent(schema)}/categorization-review/apply`,
    body,
  );
