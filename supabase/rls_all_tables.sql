-- ============================================================================
-- SEC-02 remediation — lock every backend-only table to service-role only.
--
-- A live audit (2026-06-10, via direct Postgres) found the real exposure was
-- NOT disabled RLS. It was:
--   1. Permissive "USING (true)" policies for the `public` role on
--      transactions, expenses, agent_posts, customers, dashboard_metrics,
--      inventory_alerts, reviews (ALL ops) and fixed_costs (SELECT) — i.e. the
--      internet could READ, INSERT, UPDATE, DELETE and TRUNCATE those tables.
--   2. Default anon/authenticated INSERT/UPDATE/DELETE/TRUNCATE grants on ~48
--      tables (Supabase default), only partially gated by RLS.
--
-- This migration locks every base table that the frontend does NOT use directly
-- to service-role only: enable RLS + revoke all anon/authenticated grants, and
-- drop the permissive public policies. The backend uses the service_role key,
-- which has BYPASSRLS and its own grants, so it is unaffected.
--
-- The KEEP list below is the set of tables the React app reads/writes directly
-- with the anon/authenticated JWT (verified by grepping supabase.from(...) in
-- src/). Their RLS policies (is_ea / is_client_schema / self / anon-insert)
-- remain the enforcement boundary and are left untouched.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

do $$
declare
  t text;
  keep text[] := array[
    'client_users','ea_users','ea_clients','ea_flags','ea_approvals',
    'ea_category_overrides','ea_notes','expense_overrides','messages','leads'
  ];
begin
  for t in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname <> all(keep)
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('revoke all on public.%I from anon, authenticated;', t);
  end loop;
end $$;

-- Drop the permissive public USING(true) policies that allowed read/write.
drop policy if exists "Allow all operations" on public.transactions;
drop policy if exists "Allow all operations" on public.expenses;
drop policy if exists "Allow public read"    on public.fixed_costs;
drop policy if exists "Allow all operations" on public.agent_posts;
drop policy if exists "Allow all operations" on public.customers;
drop policy if exists "Allow all operations" on public.dashboard_metrics;
drop policy if exists "Allow all operations" on public.inventory_alerts;
drop policy if exists "Allow all operations" on public.reviews;

-- ── Verification (expect ZERO rows from each) ───────────────────────────────
-- Permissive public policies left:
--   select tablename, policyname from pg_policies where schemaname='public'
--     and roles && array['public','anon']::name[] and qual='true';
-- anon/authenticated grants on financial tables left:
--   select * from information_schema.role_table_grants where table_schema='public'
--     and grantee in ('anon','authenticated')
--     and table_name in ('transactions','expenses','monthly_expenses','cash_balances');
-- Base tables without RLS:
--   select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
--     where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;
