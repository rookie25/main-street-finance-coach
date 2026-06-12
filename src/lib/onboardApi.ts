// Client for the FastAPI onboarding backend (groundstack on Railway).
// The frontend NEVER talks to Supabase for onboarding — all credential handling
// is server-side. Only non-sensitive display data comes back from these calls.

const BASE = (import.meta.env.VITE_RAILWAY_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export interface OnboardSession {
  status: string;
  amount_due: number | null;
  currency: string;
  expires_at: string;
  business_name: string | null;
  onboarding_status: string | null;
}

export interface SubmitPayload {
  token: string;
  business_name?: string;
  owner_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  business_type?: string;
  // Legacy named fields kept for backwards compatibility with existing backend handler.
  square_api_key?: string;
  plaid_token?: string;
  gmail_token?: string;
  // Flexible map for all integration keys; backend encrypts each value.
  integration_keys?: Record<string, string>;
}

async function handle<T>(res: Response): Promise<T> {
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

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getSession(token: string): Promise<OnboardSession> {
  return fetch(`${BASE}/onboard/session/${encodeURIComponent(token)}`).then((r) =>
    handle<OnboardSession>(r),
  );
}

export function submitOnboarding(payload: SubmitPayload): Promise<{ ok: boolean; status: string }> {
  return fetch(`${BASE}/onboard/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((r) => handle(r));
}

export function createCheckout(token: string): Promise<{ url: string }> {
  return fetch(`${BASE}/onboard/create-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).then((r) => handle<{ url: string }>(r));
}

export function getSquareAuthUrl(token: string): Promise<{ auth_url: string }> {
  return fetch(`${BASE}/onboard/square/authorize?token=${encodeURIComponent(token)}`).then((r) =>
    handle<{ auth_url: string }>(r),
  );
}

// ── Plaid Link ────────────────────────────────────────────────────────────────
// createPlaidLinkToken → open Plaid Link with the returned link_token →
// exchangePlaidPublicToken on success. The access token never touches the
// browser; the backend exchanges + encrypts it server-side.

export function createPlaidLinkToken(token: string): Promise<{ link_token: string; expiration: string | null }> {
  return fetch(`${BASE}/onboard/plaid/link-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).then((r) => handle<{ link_token: string; expiration: string | null }>(r));
}

export interface PlaidExchangePayload {
  token: string;
  public_token: string;
  institution_name?: string;
  accounts?: unknown[];
}

export function exchangePlaidPublicToken(
  payload: PlaidExchangePayload,
): Promise<{ connected: boolean; institution_name: string }> {
  return fetch(`${BASE}/onboard/plaid/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((r) => handle<{ connected: boolean; institution_name: string }>(r));
}
