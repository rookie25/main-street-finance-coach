// Client Portal backend API (Component 4) — financial READ side.
// Every request carries the client's Supabase access token as a Bearer header.
// The backend validates it and confirms client_users membership.
//
// Expense override WRITES do NOT go here — see clientData.ts which talks to
// Supabase directly under RLS (is_client_schema()).
import { supabase } from "@/lib/supabase";

const BASE = (import.meta.env.VITE_RAILWAY_URL as string | undefined)?.replace(/\/$/, "") ?? "";

// ── Shared types ─────────────────────────────────────────────────────────────

export interface ClientProfile {
  id: string;
  email: string;
  full_name: string | null;
  client_schema: string;
  business_name: string | null;
}

export interface PnlSummary {
  total_revenue:  number;
  sales_tax:      number;
  net_revenue:    number;
  total_cogs:     number;
  total_opex:     number;
  total_expenses: number;
  net_income:     number;
}

export interface CashBalance {
  account_name: string;
  amount:       number;
  as_of_date:   string;
}

export interface TopExpense {
  id:       string;
  vendor:   string;
  amount:   number;
  category: string;
  date:     string;
}

export interface DashboardAlert {
  type:     string;
  severity: "warning" | "info";
  message:  string;
}

export interface Briefing {
  title:      string | null;
  body:       string;
  created_at: string;
}

export interface DashboardData {
  month:         string;
  pnl:           PnlSummary;
  cash_balances: CashBalance[];
  top_expenses:  TopExpense[];
  alerts:        DashboardAlert[];
  briefing:      Briefing | null;
  tax_due?: {
    date:       string;
    amount?:    number;
    days_until?: number;
  };
}

export interface ExpenseItem {
  id:                string;
  vendor:            string;
  vendor_original:   string;
  amount:            number;
  category:          string;
  category_original: string;
  date:              string;
  date_original:     string;
  expense_type:      string;
  source:            string;
  has_override:      boolean;
}

export interface ExpensesData {
  month:    string;
  expenses: ExpenseItem[];
  total:    number;
}

export interface ReportLinks {
  month:                  string;
  available_months:       string[];
  pnl_pdf_url:            string | null;
  balance_sheet_pdf_url:  string | null;
  expires_in:             number | null;
}

export interface ReportForRange {
  month:                 string;
  pnl_pdf_url:           string | null;
  balance_sheet_pdf_url: string | null;
}

export interface ReportLinksRange {
  available_months: string[];
  reports:          ReportForRange[];
  expires_in:       number | null;
}

export interface TaxDeadline {
  quarter:    string;
  due_date:   string;
  days_until: number;
}

export interface TaxEntry {
  month:         string;
  tax_collected: number;
}

export interface TaxData {
  upcoming_deadlines:    TaxDeadline[];
  monthly_history:       TaxEntry[];
  most_recent_payable:   { month: string; amount: number } | null;
}

export interface ChatResponse {
  reply: string;
  model: string;
}

export interface ClientNotification {
  type:     "report_ready" | "tax_deadline" | "amex_past_due" | "low_balance" | "unknown_charge" | "monthly_close";
  severity: "urgent" | "warning" | "info";
  title:    string;
  body:     string;
  meta:     Record<string, unknown>;
}

export interface MonthlyCloseTaskInstructions {
  title:          string;
  description:    string;
  steps:          string[] | null;
  input_type:     "number" | "file";
  accepted_types?: string;
  help_url?:       string;
}

export interface MonthlyCloseTask {
  id:              string;
  task_type:       "cash_drawer" | "doordash_csv" | "amex_csv";
  status:          "pending" | "submitted" | "processed";
  submitted_at:    string | null;
  submitted_value: string | null;
  processed_at:    string | null;
  instructions:    MonthlyCloseTaskInstructions;
}

export interface MonthlyCloseData {
  period:      string | null;
  tasks:       MonthlyCloseTask[];
  done_count:  number;
  total_count: number;
  all_done:    boolean;
}

export interface NotificationsData {
  notifications: ClientNotification[];
  unread_count:  number;
}

// ── Error class ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: await authHeader() });
  if (res.status === 429) {
    throw new ApiError("You're sending too many requests. Please wait a moment and try again.", 429);
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { /* non-JSON */ }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method:  "POST",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  if (res.status === 429) {
    throw new ApiError("You're sending too many requests. Please wait a moment and try again.", 429);
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { /* non-JSON */ }
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
  if (res.status === 429) {
    throw new ApiError("You're sending too many requests. Please wait a moment and try again.", 429);
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try { const b = await res.json(); if (b?.detail || b?.error) detail = b.detail ?? b.error; } catch { /* non-JSON */ }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

export const getMe = () =>
  get<ClientProfile>("/client/me");

export const getDashboard = (month?: string) =>
  get<DashboardData>(`/client/dashboard${month ? `?month=${encodeURIComponent(month)}` : ""}`);

export const getExpenses = (month?: string) =>
  get<ExpensesData>(`/client/expenses${month ? `?month=${encodeURIComponent(month)}` : ""}`);

export const getReports = (month?: string) =>
  get<ReportLinks>(`/client/reports${month ? `?month=${encodeURIComponent(month)}` : ""}`);

export const getReportsRange = (start: string, end: string) =>
  get<ReportLinksRange>(`/client/reports?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);

export const getTax = () =>
  get<TaxData>("/client/tax");

export const getNotifications = () =>
  get<NotificationsData>("/client/notifications");

export async function markNotificationsRead(): Promise<void> {
  try {
    const headers = await authHeader();
    await fetch(`${BASE}/client/notifications/read`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch {
    // Non-critical — ignore silently
  }
}

export const answerUnknownCharge = (
  chargeId: string,
  category: string | null,
  plCategory: string | null,
  isPersonal: boolean,
) =>
  post<{ ok: boolean; vendor: string; category: string; rule_created: boolean }>(
    `/client/unknown-charges/${encodeURIComponent(chargeId)}/answer`,
    { category, pl_category: plCategory, is_personal: isPersonal },
  );

export const sendChat = (
  messages: { role: "user" | "assistant"; content: string }[],
  month?: string,
) =>
  post<ChatResponse>("/client/chat", { messages, month });

export interface MorningBriefing {
  content:    string;
  data:       Record<string, unknown> | null;
  created_at: string;
}

export const getMorningBriefing = () =>
  get<MorningBriefing | null>("/client/morning-briefing");

// Append &download= to a signed URL so the browser prompts a file download.
export const asDownloadUrl = (signedUrl: string, filename: string) =>
  `${signedUrl}&download=${encodeURIComponent(filename)}`;

// ── Monthly Close ─────────────────────────────────────────────────────────────

export const getMonthlyClose = () =>
  get<MonthlyCloseData>("/client/monthly-close");

export const submitCashDrawer = (period: string, amount: number) =>
  post<{ success: boolean; amount: number }>(
    "/client/monthly-close/cash-drawer",
    { period, amount },
  );

export const resetMonthlyCloseTask = (
  period:   string,
  taskType: "cash_drawer" | "doordash_csv" | "amex_csv",
) =>
  patch<{ success: boolean; task_type: string; period: string; message: string }>(
    "/client/monthly-close/reset-task",
    { period, task_type: taskType },
  );

export async function uploadMonthlyCSV(
  taskType: "doordash_csv" | "amex_csv",
  period:   string,
  file:     File,
): Promise<{ success: boolean; processed: boolean; result: Record<string, unknown> }> {
  const { data } = await supabase.auth.getSession();
  const token    = data.session?.access_token;
  const form     = new FormData();
  form.append("task_type", taskType);
  form.append("period",    period);
  form.append("file",      file);
  const res = await fetch(`${BASE}/client/monthly-close/upload-csv`, {
    method:  "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    form,
  });
  if (!res.ok) {
    let detail = `Upload failed (${res.status})`;
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { /* */ }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<{ success: boolean; processed: boolean; result: Record<string, unknown> }>;
}

// ── Receipt upload / confirm ──────────────────────────────────────────────────

export interface ReceiptUploadResult {
  raw_id:           string | null;
  vendor:           string | null;
  amount:           number | null;
  date:             string | null;
  category:         string | null;
  confidence:       "high" | "medium" | "low";
  confidence_score: number;
  receipt_url:      string;
  notes:            string | null;
}

export interface ReceiptConfirmPayload {
  raw_id:    string | null;
  vendor:    string;
  amount:    number;
  date:      string;
  category:  string | null;
  notes?:    string | null;
}

export interface ReceiptConfirmResult {
  // Normal save
  expense_id?:  string;
  vendor?:      string;
  amount?:      number;
  date?:        string;
  category?:    string | null;
  receipt_url?: string | null;
  // Duplicate — receipt already in books (e.g. logged via WhatsApp pipeline)
  status?:  "duplicate";
  message?: string;
}

export async function uploadReceipt(file: File): Promise<ReceiptUploadResult> {
  const { data } = await supabase.auth.getSession();
  const token    = data.session?.access_token;
  const form     = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/client/upload-receipt`, {
    method:  "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    form,
  });
  if (res.status === 429) {
    throw new ApiError("You're sending too many requests. Please wait a moment and try again.", 429);
  }
  if (!res.ok) {
    let detail = `Upload failed (${res.status})`;
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { /* */ }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<ReceiptUploadResult>;
}

export const confirmReceipt = (payload: ReceiptConfirmPayload) =>
  post<ReceiptConfirmResult>("/client/confirm-receipt", payload);

// ── Expense flagging ──────────────────────────────────────────────────────────

export const getFlaggedExpenses = () =>
  get<{ flagged_ids: string[] }>("/client/expenses/flagged");

export const flagExpense = (id: string) =>
  post<{ flagged: boolean }>(`/client/expenses/${encodeURIComponent(id)}/flag`, {
    reason: "Review requested by client",
  });

export async function unflagExpense(id: string): Promise<{ flagged: boolean }> {
  const res = await fetch(`${BASE}/client/expenses/${encodeURIComponent(id)}/flag`, {
    method:  "DELETE",
    headers: await authHeader(),
  });
  if (!res.ok) {
    let detail = `Unflag failed (${res.status})`;
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { /* */ }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<{ flagged: boolean }>;
}

// ── Expense edits / correction requests ──────────────────────────────────────

export interface PatchExpensePayload {
  vendor?:   string;
  date?:     string;
  category?: string;
  notes?:    string;
  amount?:   number;   // freely editable — flagged to EA only for prior-month or >$500 delta
}

export interface PatchExpenseResult {
  updated:            boolean;
  expense_id:         string;
  flagged_for_review: boolean;
  flag_reasons:       string[];
}

export async function patchExpense(expenseId: string, payload: PatchExpensePayload): Promise<PatchExpenseResult> {
  const res = await fetch(`${BASE}/client/expense/${encodeURIComponent(expenseId)}`, {
    method:  "PATCH",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = `Update failed (${res.status})`;
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { /* */ }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<PatchExpenseResult>;
}

export interface DeleteExpenseResult {
  deleted?: boolean;
  flagged?: boolean;
  message?: string;
}

export async function deleteExpense(expenseId: string): Promise<DeleteExpenseResult> {
  const res = await fetch(`${BASE}/client/expense/${encodeURIComponent(expenseId)}`, {
    method:  "DELETE",
    headers: await authHeader(),
  });
  if (!res.ok) {
    let detail = `Delete failed (${res.status})`;
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { /* */ }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<DeleteExpenseResult>;
}
