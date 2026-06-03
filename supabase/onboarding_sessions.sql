-- Component 2 — Client Onboarding Portal
-- New table: one row per onboarding link issued to a client.
--
-- The token is a server-generated, URL-safe secret (the value in /onboard/:token).
-- It is the table's primary key. Tokens expire 7 days after creation.
--
-- Access model: this table is touched ONLY by the FastAPI backend using the
-- Supabase service_role key (which bypasses RLS). RLS is enabled with NO policies,
-- so the public anon key has ZERO access — tokens are never readable client-side.

create table if not exists public.onboarding_sessions (
  token         text primary key,
  client_schema text not null,            -- soft reference to public.clients.schema_name
  status        text not null default 'pending',  -- pending | submitted | paid | completed | expired
  amount_due    numeric,                  -- authoritative payment amount (set at link creation, in dollars)
  currency      text not null default 'usd',
  expires_at    timestamptz not null default (now() + interval '7 days'),
  created_at    timestamptz not null default now()
);

-- Lookups by client_schema (e.g. "find this client's open session").
create index if not exists onboarding_sessions_client_schema_idx
  on public.onboarding_sessions (client_schema);

-- OPTIONAL hard foreign key. A FK requires public.clients.schema_name to carry a
-- UNIQUE (or PK) constraint. Your current clients schema shows none, so this is
-- left commented out. To enable referential integrity, first ensure schema_name
-- is unique, then uncomment:
--
--   alter table public.clients
--     add constraint clients_schema_name_key unique (schema_name);
--   alter table public.onboarding_sessions
--     add constraint onboarding_sessions_client_schema_fkey
--     foreign key (client_schema) references public.clients (schema_name)
--     on delete cascade;

-- Lock the table down: enable RLS, add no policies. service_role bypasses RLS;
-- anon/authenticated get nothing.
alter table public.onboarding_sessions enable row level security;
