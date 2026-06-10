-- ============================================================================
-- SEC-02 remediation — codify Row-Level Security on all backend-only tables.
--
-- Context: a live anon-key probe (2026-06-10) found three tables world-readable
-- (transactions=7,698 rows, expenses=122, fixed_costs=21). All other financial
-- tables already had RLS enforced. This migration:
--   1. Hard-locks the three exposed tables (enable RLS + revoke anon grants).
--   2. Idempotently asserts RLS on every backend-only financial table so the
--      posture is reproducible from source control and cannot silently regress.
--
-- SAFETY: every backend-only table here is read/written ONLY via the FastAPI
-- service-role key, which BYPASSES RLS. Enabling RLS with no policy = "service
-- role only", which is the intended design. The frontend never reads these
-- tables directly (verified by grepping supabase.from(...) in src/).
--
-- DO NOT add these portal tables here — the frontend reads them with the
-- authenticated/anon JWT and they already have correct policies:
--   messages, leads, client_users, ea_users, expense_overrides, client_briefings,
--   ea_flags, ea_approvals, ea_category_overrides, ea_notes, ea_clients
--
-- Idempotent: safe to re-run. Enabling RLS twice is a no-op.
-- ============================================================================

-- ── 1. The three confirmed-exposed tables: enable RLS + revoke anon reads ──
alter table public.transactions enable row level security;
alter table public.fixed_costs  enable row level security;
alter table public.expenses     enable row level security;

revoke select on public.transactions from anon, authenticated;
revoke select on public.fixed_costs  from anon, authenticated;
revoke select on public.expenses     from anon, authenticated;

-- ── 2. Assert RLS on every other backend-only financial table (idempotent) ──
do $$
declare
  t text;
  backend_only text[] := array[
    'monthly_expenses', 'plaid_transactions', 'cash_balances', 'monthly_tax',
    'fixed_assets', 'equity_movements', 'equity_baseline', 'merchant_rules',
    'unknown_charges', 'monthly_close_tasks', 'pending_adjustments',
    'client_ai_memory', 'bounce_detection_log', 'monthly_verification_flags',
    'receipts_raw', 'expense_audit_log', 'morning_briefings', 'mileage_log',
    'quickbooks_balance_sheet', 'square_order_items', 'plaid_connections',
    'clients', 'ea_signup_requests', 'ea_adjustments', 'onboarding_sessions'
  ];
begin
  foreach t in array backend_only loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('alter table public.%I enable row level security;', t);
      execute format('revoke select on public.%I from anon;', t);
    end if;
  end loop;
end $$;

-- ── 3. Verification query (run after applying) ──────────────────────────────
-- Expect rls_enabled = true for every row:
--   select c.relname, c.relrowsecurity as rls_enabled
--   from pg_class c join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;
-- (Should return ZERO rows once this migration + the portal RLS files are applied.)
