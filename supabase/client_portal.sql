-- ============================================================================
-- Component 4 — Client Portal (/app)  —  Supabase schema
-- ============================================================================
--
-- ACCESS MODEL (same architectural split as Component 3 EA Portal):
--
--   client_users / expense_overrides
--     → read/written DIRECTLY by Mark's authenticated browser session
--       (supabase-js + Mark's JWT). RLS is the enforcement boundary via
--       is_client() / is_client_schema().
--
--   client_briefings
--     → written ONLY by service-role scripts. Clients may SELECT their own
--       schema's rows; INSERT/UPDATE/DELETE are blocked at the policy level.
--
--   financials (monthly_expenses, cash_balances, monthly_tax, transactions,
--               plaid_transactions)
--     → backend-only (FastAPI service-role). The `authenticated` role is
--       never granted SELECT on these tables, so Mark's JWT cannot reach
--       them via PostgREST. The /client/* endpoints return safe projections.
--
-- NOTE: The existing `agent_posts` table in Supabase is an unrelated
-- social-media content calendar (columns: day, pillar, caption, hashtags,
-- approved, posted, week_of). It is NOT used by Component 4. Morning
-- briefings live in `client_briefings`.
--
-- NEW TABLES:
--   client_users       — allowlist of client logins (mirrors ea_users)
--   expense_overrides  — Mark's edits: vendor name, date, category only
--                        (amount is absent by design)
--   client_briefings   — morning briefing / alert rows from agent scripts
--
-- Idempotent: IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS before CREATE.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0a. Client roster table
-- ---------------------------------------------------------------------------
create table if not exists public.client_users (
  user_id       uuid        primary key references auth.users (id) on delete cascade,
  email         text        not null,
  full_name     text,
  client_schema text        not null,   -- 'groundstack'
  created_at    timestamptz not null default now()
);

alter table public.client_users enable row level security;

drop policy if exists client_users_self_read on public.client_users;
create policy client_users_self_read on public.client_users
  for select to authenticated
  using (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 0b. is_client() — is this JWT on the client roster?
-- ---------------------------------------------------------------------------
create or replace function public.is_client()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.client_users where user_id = auth.uid()
  );
$$;

revoke all    on function public.is_client()     from public;
grant execute on function public.is_client()     to   authenticated;


-- ---------------------------------------------------------------------------
-- 0c. is_client_schema(p_schema) — does this JWT own that schema?
-- ---------------------------------------------------------------------------
create or replace function public.is_client_schema(p_schema text)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.client_users
    where user_id = auth.uid() and client_schema = p_schema
  );
$$;

revoke all    on function public.is_client_schema(text) from public;
grant execute on function public.is_client_schema(text) to   authenticated;


-- ---------------------------------------------------------------------------
-- 1. expense_overrides — client edits to vendor name, date, category only
-- ---------------------------------------------------------------------------
-- amount is absent by design — clients cannot touch financial figures.
-- One override per expense; upsert to change. Backend joins as display layer;
-- the underlying monthly_expenses row is never mutated.
create table if not exists public.expense_overrides (
  id                   bigint      generated always as identity primary key,
  client_schema        text        not null,
  expense_id           text        not null,
  vendor_name_override text,
  date_override        date,
  category_override    text,
  changed_by           uuid        not null default auth.uid()
                                   references auth.users (id),
  changed_at           timestamptz not null default now(),
  unique (client_schema, expense_id)
);

create index if not exists expense_overrides_client_idx
  on public.expense_overrides (client_schema);

alter table public.expense_overrides enable row level security;

drop policy if exists expense_overrides_own on public.expense_overrides;
create policy expense_overrides_own on public.expense_overrides
  for all to authenticated
  using     (public.is_client_schema(client_schema))
  with check (public.is_client_schema(client_schema));


-- ---------------------------------------------------------------------------
-- 2. client_briefings — morning briefings and alerts from agent scripts
-- ---------------------------------------------------------------------------
-- Service-role writes only. Clients SELECT their own schema's rows.
create table if not exists public.client_briefings (
  id            bigint      generated always as identity primary key,
  client_schema text        not null,
  period        text        not null,              -- 'YYYY-MM'
  post_type     text        not null default 'briefing',
                                                   -- 'briefing' | 'alert' | 'summary'
  title         text,
  body          text        not null,
  created_at    timestamptz not null default now()
);

create index if not exists client_briefings_client_period_idx
  on public.client_briefings (client_schema, period, created_at desc);

alter table public.client_briefings enable row level security;

drop policy if exists client_briefings_read on public.client_briefings;
create policy client_briefings_read on public.client_briefings
  for select to authenticated
  using (public.is_client_schema(client_schema));


-- ---------------------------------------------------------------------------
-- 3. Seed Mark's client account
-- ---------------------------------------------------------------------------
-- Run AFTER creating his Supabase Auth account:
--   Dashboard → Authentication → Users → "Add user"
--   Email: mark@groundstackcoffee.com
insert into public.client_users (user_id, email, full_name, client_schema)
select id, email, 'Mark', 'groundstack'
from   auth.users
where  email = 'mark@groundstackcoffee.com'
on conflict (user_id) do nothing;
