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
  business_type: string | null;
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

export interface AccountsReceivable {
  outstanding:   number;
  overdue:       number;
  paid:          number;
  draft:         number;
  open_count:    number;
  overdue_count: number;
  count:         number;
}

export interface DashboardData {
  month:         string;
  pnl:           PnlSummary;
  cash_balance?:      number | null;   // snapshot (nightly)
  live_cash_balance?: number | null;   // real-time Plaid (current month only)
  cash_balances: CashBalance[];
  top_expenses:  TopExpense[];
  alerts:        DashboardAlert[];
  briefing:      Briefing | null;
  accounts_receivable?: AccountsReceivable;
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
  pending?:          boolean;
  recurring?:        boolean;
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

export interface IncomeTaxSetAside {
  recommended_monthly:     number;
  based_on_avg_net_income: number;
  months_analyzed:         number;
  planning_rate:           string;
  next_deadline:           string;
  set_aside_by_deadline:   number;
  disclaimer:              string;
}

export interface SalesTaxSetAside {
  quarter:           string;
  due_date:          string;
  days_until:        number;
  accrued_liability: number;
  months_counted:    number;
  weeks_remaining:   number;
  weekly_set_aside:  number;
  disclaimer:        string;
}

export interface TaxData {
  upcoming_deadlines:    TaxDeadline[];
  monthly_history:       TaxEntry[];
  most_recent_payable:   { month: string; amount: number } | null;
  income_tax_setaside?:  IncomeTaxSetAside | null;
  sales_tax_setaside?:   SalesTaxSetAside | null;
}

export interface ChatResponse {
  reply: string;
  model: string;
}

export interface ClientNotification {
  type:     "report_ready" | "tax_deadline" | "amex_past_due" | "low_balance" | "unknown_charge"
          | "monthly_close" | "revenue_trend" | "vendor_anomaly" | "cash_runway";
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

// AI chat history — persisted server-side so conversations sync across devices.
export interface ChatHistoryMessage { role: "user" | "assistant"; content: string; created_at?: string; }

export async function getChatHistory(month: string): Promise<{ month: string; messages: ChatHistoryMessage[] }> {
  return get(`/client/chat/history?month=${encodeURIComponent(month)}`);
}

export async function saveChatTurn(
  month: string,
  messages: { role: string; content: string }[],
): Promise<{ saved: number }> {
  return post(`/client/chat/history`, { month, messages });
}

export async function clearChatHistory(month: string): Promise<void> {
  const res = await fetch(`${BASE}/client/chat/history?month=${encodeURIComponent(month)}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status);
}

export const getMe = () =>
  get<ClientProfile>("/client/me");

export const getDashboard = (month?: string) =>
  get<DashboardData>(`/client/dashboard${month ? `?month=${encodeURIComponent(month)}` : ""}`);

export interface ConnectionHealth {
  overall: "healthy" | "stale" | "error" | "unknown";
  connections: {
    source:           string;
    status:           "healthy" | "stale" | "error";
    last_synced_at:   string | null;
    hours_since_sync: number | null;
    message:          string;
  }[];
  needs_bank_relink?: boolean;
}

export const getConnectionHealth = () =>
  get<ConnectionHealth>("/client/connection-health");

// Plaid re-link (#12a): reconnect an expired bank via Link update mode.
export const createPlaidRelinkToken = () =>
  post<{ link_token: string; item_id: string | null; institution_name: string | null }>(
    "/client/plaid/relink-token", {});

export const completePlaidRelink = (itemId?: string | null) =>
  post<{ ok: boolean }>("/client/plaid/relink-complete", itemId ? { item_id: itemId } : {});

// Download every monthly statement as a single zip (auth header required, so we
// fetch a blob and trigger the download rather than a plain link).
export async function downloadAllDocuments(): Promise<void> {
  const res = await fetch(`${BASE}/client/documents/export`, { headers: await authHeader() });
  if (!res.ok) throw new ApiError(`Export failed (${res.status})`, res.status);
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = "financial_records.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const getExpenses = (opts?: { month?: string; start?: string; end?: string }) => {
  const qs = new URLSearchParams();
  if (opts?.start && opts?.end) { qs.set("start", opts.start); qs.set("end", opts.end); }
  else if (opts?.month)         { qs.set("month", opts.month); }
  const s = qs.toString();
  return get<ExpensesData>(`/client/expenses${s ? `?${s}` : ""}`);
};

export const getReports = (month?: string) =>
  get<ReportLinks>(`/client/reports${month ? `?month=${encodeURIComponent(month)}` : ""}`);

export const getReportsRange = (start: string, end: string) =>
  get<ReportLinksRange>(`/client/reports?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);

export const getTax = () =>
  get<TaxData>("/client/tax");

export interface ForecastPoint { week: number; date: string; balance: number; }
export interface CashForecast {
  available:      boolean;
  note?:          string;
  start_balance?: number;
  weekly_net?:    number;
  weeks?:         number;
  as_of?:         string;
  points?:        ForecastPoint[];
  low_point?:     ForecastPoint;
  disclaimer?:    string;
}
export const getCashForecast = (weeks = 13) =>
  get<CashForecast>(`/client/cash-forecast?weeks=${weeks}`);

// Phase 4 — forward P&L + cash forecast (read-only, structured by cost layer).
export interface DebtLine {
  label:        string;   // e.g. "Term loan", "Equipment loan", "Sales holdback"
  payment:      number;   // this month's total payment (interest + principal / holdback)
  balance_end:  number;   // remaining balance at month end
}
export interface PnlForecastRow {
  period:                       string;
  revenue:                      number;
  cogs:                         number;
  operating_expenses:           number;
  loan_interest:                number;
  net_income:                   number;
  loan_principal:               number;
  owner_draws:                  number;
  projected_cash:               number;
  // Per-client debt (replaces the pilot-specific sjc_/square_capital_ fields);
  // each client sees only the debt they actually have.
  debt_lines:                   DebtLine[];
}
export interface PnlForecast {
  available:        boolean;
  note?:            string;
  schema?:          string;
  anchor_period?:   string;
  horizon?:         number;
  trailing_months?: string[];
  starting_cash?:   number;
  rows?:            PnlForecastRow[];
  assumptions?:     string[];
}
export const getPnlForecast = (horizon = 6, growth = 0) =>
  get<PnlForecast>(`/client/pnl-forecast?horizon=${horizon}&growth=${growth}`);

// Suspense clarification — owner side. The owner explains their own uncategorized
// transactions in plain language; the EA classifies. Never shows GL buckets.
export interface SuspenseQuestion {
  merchant:       string;
  category:       string;
  count:          number;
  amount:         number;
  dates:          string[];
  status:         string;          // open | asked | answered | resolved
  ea_question:    string | null;   // set when the EA asked about this item
  owner_answer:   string | null;
  owner_category: string | null;
}
export interface SuspenseQuestions {
  available:        boolean;
  items:            SuspenseQuestion[];
  owner_categories: string[];
}
export const getSuspenseQuestions = () =>
  get<SuspenseQuestions>("/client/suspense-questions");

export const answerSuspenseQuestion = (
  payload: { merchant?: string; category?: string; owner_category: string; note?: string },
) =>
  post<{ ok: boolean; suggested_bucket: string | null }>(
    "/client/suspense-questions/answer",
    payload,
  );

export interface NextPayroll {
  available:   boolean;
  due_date?:   string;
  days_until?: number;
  amount?:     number;
  line_items?: number;
  balance?:    number | null;
  status?:     "short" | "tight" | "covered" | "unknown";
}
export const getNextPayroll = () =>
  get<NextPayroll>("/client/next-payroll");

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

// Streaming chat — reads Server-Sent Events from /client/chat/stream and calls
// onChunk(text) as tokens arrive. Throws on transport/stream error so the caller
// can fall back to the non-streaming sendChat().
export async function streamChat(
  messages: { role: "user" | "assistant"; content: string }[],
  month: string | undefined,
  onChunk: (text: string) => void,
): Promise<void> {
  const res = await fetch(`${BASE}/client/chat/stream`, {
    method:  "POST",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body:    JSON.stringify({ messages, month }),
  });
  if (res.status === 429) throw new ApiError("Too many requests", 429);
  if (!res.ok || !res.body) throw new ApiError(`Stream failed (${res.status})`, res.status);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const evt = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      let payload: { type?: string; text?: string; detail?: string };
      try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }
      if (payload.type === "text" && payload.text) onChunk(payload.text);
      else if (payload.type === "error") throw new ApiError(payload.detail || "stream error", 502);
      else if (payload.type === "done") return;
    }
  }
}

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

// ── Receipts log (capture history, separate from the books) ───────────────────
export interface ClientReceipt {
  id:         string;
  vendor:     string | null;
  amount:     number | null;
  date:       string | null;
  category:   string | null;
  source:     string;
  status:     "logged" | "pending_review";
  image_url:  string | null;
  created_at: string | null;
}

export interface ReceiptsData {
  start:    string;
  end:      string;
  receipts: ClientReceipt[];
  total:    number;
}

export const getReceipts = (start?: string, end?: string) => {
  const qs = new URLSearchParams();
  if (start) qs.set("start", start);
  if (end)   qs.set("end", end);
  const s = qs.toString();
  return get<ReceiptsData>(`/client/receipts${s ? `?${s}` : ""}`);
};

// ── Document sharing with the CPA ─────────────────────────────────────────────
export interface SharedDocument {
  id:           string;
  from:         "you" | "cpa";
  filename:     string | null;
  content_type: string | null;
  size_bytes:   number | null;
  note:         string | null;
  created_at:   string | null;
  download_url: string | null;
  seen_by_cpa:  boolean | null;
}

export const getSharedDocuments = () =>
  get<{ documents: SharedDocument[]; total: number }>("/client/documents/shared");

export async function shareDocument(file: File, note: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token    = data.session?.access_token;
  const form     = new FormData();
  form.append("file", file);
  if (note) form.append("note", note);
  const res = await fetch(`${BASE}/client/documents/share`, {
    method:  "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    form,
  });
  if (!res.ok) {
    let detail = `Upload failed (${res.status})`;
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { /* */ }
    throw new ApiError(detail, res.status);
  }
}

// ── Invoicing / Accounts Receivable ──────────────────────────────────────────

export interface InvoiceLineItem {
  description: string;
  quantity:    number;
  unit_price:  number;
  amount:      number;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

export interface Invoice {
  id:             string;
  invoice_number: string;
  customer_name:  string;
  customer_email: string | null;
  issue_date:     string;
  due_date:       string | null;
  status:         InvoiceStatus;
  line_items:     InvoiceLineItem[];
  subtotal:       number;
  tax:            number;
  total:          number;
  notes:          string | null;
  sent_at:        string | null;
  paid_at:        string | null;
  created_at:     string | null;
}

export interface InvoicesData {
  invoices: Invoice[];
  summary: {
    outstanding: number;
    overdue:     number;
    paid:        number;
    draft:       number;
    count:       number;
  };
}

export interface CreateInvoicePayload {
  customer_name:   string;
  customer_email?: string;
  issue_date?:     string;
  due_date?:       string;
  status?:         "draft" | "sent";
  tax?:            number;
  notes?:          string;
  line_items: { description: string; quantity: number; unit_price: number }[];
}

export const getInvoices = () =>
  get<InvoicesData>("/client/invoices");

export const createInvoice = (payload: CreateInvoicePayload) =>
  post<Invoice>("/client/invoices", payload);

export const updateInvoice = (id: string, patchBody: Record<string, unknown>) =>
  patch<Invoice>(`/client/invoices/${encodeURIComponent(id)}`, patchBody);

export async function deleteInvoice(id: string): Promise<void> {
  const res = await fetch(`${BASE}/client/invoices/${encodeURIComponent(id)}`, {
    method:  "DELETE",
    headers: await authHeader(),
  });
  if (!res.ok) {
    let detail = `Delete failed (${res.status})`;
    try { const b = await res.json(); if (b?.detail) detail = b.detail; } catch { /* */ }
    throw new ApiError(detail, res.status);
  }
}

/** Open the rendered invoice PDF in a new tab (auth-protected fetch → blob URL). */
export async function openInvoicePdf(id: string): Promise<void> {
  const res = await fetch(`${BASE}/client/invoices/${encodeURIComponent(id)}/pdf`, {
    headers: await authHeader(),
  });
  if (!res.ok) throw new ApiError(`Could not load PDF (${res.status})`, res.status);
  const url = URL.createObjectURL(await res.blob());
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

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

// ── Subscription billing (Stripe) ────────────────────────────────────────────

export interface BillingStatus {
  has_plan:             boolean;
  monthly_fee:          number | null;   // dollars
  currency:             string;
  interval:             string;          // "month" | "year"
  status:               string | null;   // active|trialing|past_due|canceled|...
  active:               boolean;
  current_period_end:   string | null;
  cancel_at_period_end: boolean;         // true once cancelled but still in the paid period
}

export function getBillingStatus(): Promise<BillingStatus> {
  return get<BillingStatus>("/client/billing/status");
}

// Returns a Stripe-hosted Checkout URL to start the subscription.
export function startSubscribeCheckout(): Promise<{ url: string }> {
  return post<{ url: string }>("/client/billing/subscribe", {});
}

// Returns a Stripe-hosted Customer Portal URL to manage an existing subscription.
export function openBillingPortal(): Promise<{ url: string }> {
  return post<{ url: string }>("/client/billing/portal", {});
}

// Cancel at period end — keeps access through the paid period, then lapses.
export function cancelSubscription(): Promise<{ canceled: boolean; cancel_at_period_end: boolean; current_period_end: string | null }> {
  return post("/client/billing/cancel", {});
}

// Undo a pending cancellation.
export function resumeSubscription(): Promise<{ resumed: boolean; cancel_at_period_end: boolean }> {
  return post("/client/billing/resume", {});
}
