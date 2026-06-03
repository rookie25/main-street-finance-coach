-- Leads captured from the public Contact form.
-- Run in the Supabase SQL editor (or via the CLI) against your project.

create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  business_name     text not null,
  business_type     text not null,
  monthly_revenue   text not null,
  bookkeeping_spend text not null,
  is_cpa_partner    boolean not null default false,
  message           text,
  status            text not null default 'new',
  created_at        timestamptz not null default now()
);

-- Enable Row Level Security. With RLS on and no policy, all access is denied
-- by default — policies below grant exactly what each role needs.
alter table public.leads enable row level security;

-- Anonymous visitors (the website's anon key) may only INSERT new leads.
-- They cannot read, update, or delete existing rows.
drop policy if exists "anon can insert leads" on public.leads;
create policy "anon can insert leads"
  on public.leads
  for insert
  to anon
  with check (true);

-- Authenticated users (e.g. team members via the dashboard) get full access.
drop policy if exists "authenticated full access" on public.leads;
create policy "authenticated full access"
  on public.leads
  for all
  to authenticated
  using (true)
  with check (true);
