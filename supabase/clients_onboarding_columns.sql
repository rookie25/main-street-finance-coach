-- Component 2 — Client Onboarding Portal
-- Adds onboarding/payment/credential columns to the EXISTING public.clients table.
--
-- Safe to run: every column uses ADD COLUMN IF NOT EXISTS, so it will not error
-- on re-run and will not touch existing columns or data. No primary key is added
-- (the table's natural key is schema_name).
--
-- The encrypted_* columns store Fernet (AES-256) ciphertext ONLY — never raw
-- credentials. Encryption/decryption happens server-side in the FastAPI backend.

alter table public.clients
  add column if not exists onboarding_status     text not null default 'pending',
  add column if not exists stripe_customer_id    text,
  add column if not exists encrypted_square_key  text,
  add column if not exists encrypted_plaid_token text,
  add column if not exists encrypted_gmail_token text;

-- onboarding_status lifecycle: 'pending' -> 'in_progress' -> 'paid' -> 'active'
comment on column public.clients.onboarding_status is
  'Onboarding lifecycle: pending | in_progress | paid | active';
comment on column public.clients.encrypted_square_key  is 'Fernet(AES-256) ciphertext — never store raw';
comment on column public.clients.encrypted_plaid_token is 'Fernet(AES-256) ciphertext — never store raw';
comment on column public.clients.encrypted_gmail_token is 'Fernet(AES-256) ciphertext — never store raw';
