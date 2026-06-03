-- ============================================================================
-- Component 3 — EA Portal (/ea)  —  Supabase schema
-- ============================================================================
-- Layer 2 (EA) annotation tables for Cliff Barros. These tables hold ONLY the
-- EA's own work product: flags, approvals, category overrides, and monthly notes.
--
-- They deliberately contain NO financial source data (equity, loans, asset
-- values, receipts) and NO credentials. The EA reads financials exclusively
-- through the backend's safe /ea/* endpoints (service-role, projected). The
-- public.clients table and the per-client ledger schemas are NOT exposed to the
-- `authenticated` role, so an EA session cannot reach them via PostgREST.
--
-- Access model (per Component 3 decision):
--   * ea_* tables  -> read/written DIRECTLY by the EA's authenticated browser
--                     session (supabase-js + Cliff's JWT). RLS is the real
--                     enforcement boundary: only rows-by EA users, gated by is_ea().
--   * financials   -> backend only (service-role), JWT-verified, safe projection.
--
-- Idempotent: every object uses IF NOT EXISTS / CREATE OR REPLACE, safe to re-run.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0. EA roster + membership helper
-- ---------------------------------------------------------------------------
-- The allowlist of accounts that count as "EA users". Scopes every ea_* policy
-- so that adding client/other logins to this Auth project later does NOT grant
-- them access. Written only by service_role (Vishal); EAs may read their own row.
create table if not exists public.ea_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  created_at timestamptz not null default now()
);

alter table public.ea_users enable row level security;

-- An EA can see their own roster row (used to render "flagged by" name, etc.).
drop policy if exists ea_users_self_read on public.ea_users;
create policy ea_users_self_read on public.ea_users
  for select to authenticated
  using (auth.uid() = user_id);

-- is_ea(): true iff the current JWT belongs to an EA roster member.
-- SECURITY DEFINER so it can read ea_users regardless of that table's RLS;
-- search_path pinned to public to keep it injection-safe.
create or replace function public.is_ea()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (select 1 from public.ea_users where user_id = auth.uid());
$$;

revoke all on function public.is_ea() from public;
grant execute on function public.is_ea() to authenticated;


-- ---------------------------------------------------------------------------
-- 1. ea_flags — EA flags a line item with a note/question
-- ---------------------------------------------------------------------------
create table if not exists public.ea_flags (
  id            bigint generated always as identity primary key,
  client_schema text        not null,                    -- soft ref -> public.clients.schema_name
  month         text        not null,                    -- 'YYYY-MM'
  line_item_id  text        not null,                    -- ledger line / expense id being flagged
  flag_note     text        not null,
  flagged_by    uuid        not null default auth.uid() references auth.users (id),
  resolved      boolean     not null default false,
  resolved_by   uuid        references auth.users (id),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists ea_flags_client_month_idx
  on public.ea_flags (client_schema, month);


-- ---------------------------------------------------------------------------
-- 2. ea_approvals — "April Looks Good ✅" — one approval per client per month
-- ---------------------------------------------------------------------------
create table if not exists public.ea_approvals (
  id            bigint generated always as identity primary key,
  client_schema text        not null,
  month         text        not null,                    -- 'YYYY-MM'
  approved_by   uuid        not null default auth.uid() references auth.users (id),
  approved_at   timestamptz not null default now(),
  notes         text,
  unique (client_schema, month)                          -- idempotent approve; upsert target
);


-- ---------------------------------------------------------------------------
-- 3. ea_category_overrides — EA re-categorizes an expense
-- ---------------------------------------------------------------------------
-- One current override per expense (unique key). Upsert to change it; the
-- backend reads the latest override when rendering / exporting the P&L.
create table if not exists public.ea_category_overrides (
  id                bigint generated always as identity primary key,
  client_schema     text        not null,
  expense_id        text        not null,
  original_category text,
  new_category      text        not null,
  changed_by        uuid        not null default auth.uid() references auth.users (id),
  changed_at        timestamptz not null default now(),
  unique (client_schema, expense_id)
);

create index if not exists ea_category_overrides_client_idx
  on public.ea_category_overrides (client_schema);


-- ---------------------------------------------------------------------------
-- 4. ea_notes — free-form note per client per month (independent of approval)
-- ---------------------------------------------------------------------------
create table if not exists public.ea_notes (
  client_schema text        not null,
  month         text        not null,                    -- 'YYYY-MM'
  note          text        not null default '',
  updated_by    uuid        default auth.uid() references auth.users (id),
  updated_at    timestamptz not null default now(),
  primary key (client_schema, month)
);


-- ---------------------------------------------------------------------------
-- 5. RLS — only EA users (is_ea()) may read/write the EA-data tables
-- ---------------------------------------------------------------------------
-- Supabase grants table privileges to `authenticated` by default; RLS below is
-- what actually gates access. Each policy is FOR ALL (select/insert/update/
-- delete) restricted to EA roster members. Actor columns (flagged_by, etc.)
-- default to auth.uid() so rows are self-attributed.
alter table public.ea_flags              enable row level security;
alter table public.ea_approvals          enable row level security;
alter table public.ea_category_overrides enable row level security;
alter table public.ea_notes              enable row level security;

drop policy if exists ea_flags_rw on public.ea_flags;
create policy ea_flags_rw on public.ea_flags
  for all to authenticated
  using (public.is_ea()) with check (public.is_ea());

drop policy if exists ea_approvals_rw on public.ea_approvals;
create policy ea_approvals_rw on public.ea_approvals
  for all to authenticated
  using (public.is_ea()) with check (public.is_ea());

drop policy if exists ea_category_overrides_rw on public.ea_category_overrides;
create policy ea_category_overrides_rw on public.ea_category_overrides
  for all to authenticated
  using (public.is_ea()) with check (public.is_ea());

drop policy if exists ea_notes_rw on public.ea_notes;
create policy ea_notes_rw on public.ea_notes
  for all to authenticated
  using (public.is_ea()) with check (public.is_ea());


-- ---------------------------------------------------------------------------
-- 6. Seed the EA roster with Cliff  (run AFTER his auth user exists)
-- ---------------------------------------------------------------------------
-- First create the login: Supabase Dashboard -> Authentication -> Users ->
-- "Add user" -> email cliff@bmb.associates (set a password / send invite).
-- Then this picks up his user_id by email and enrolls him as an EA:
insert into public.ea_users (user_id, email, full_name)
select id, email, 'Cliff Barros'
from auth.users
where email = 'cliff@bmb.associates'
on conflict (user_id) do nothing;
