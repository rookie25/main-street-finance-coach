-- ============================================================================
-- Multi-EA isolation + EA signup queue
-- Run AFTER ea_portal.sql (ea_users must exist).
--
-- PRODUCTION SAFETY — Cliff is actively using the portal. Run in this order:
--   1. Create ea_clients table          (safe, additive)
--   2. Create is_ea_for_client()        (safe, additive)
--   3. Create ea_signup_requests table  (safe, additive)
--   4. SEED Cliff's assignment          ← verify 1 row returned before Step 5
--   5. Tighten RLS on ea_* tables       ← safe ONLY after Step 4 is committed
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. ea_clients — junction table: one row per EA ↔ client assignment
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ea_clients (
  id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ea_user_id    uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  client_schema text        NOT NULL,
  assigned_by   text,                          -- email of admin who created the assignment
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ea_user_id, client_schema)
);

CREATE INDEX IF NOT EXISTS ea_clients_ea_user_idx ON public.ea_clients (ea_user_id);
CREATE INDEX IF NOT EXISTS ea_clients_schema_idx  ON public.ea_clients (client_schema);

ALTER TABLE public.ea_clients ENABLE ROW LEVEL SECURITY;

-- EA can read their own assignment rows (needed by the frontend sidebar)
DROP POLICY IF EXISTS ea_clients_self_read ON public.ea_clients;
CREATE POLICY ea_clients_self_read ON public.ea_clients
  FOR SELECT TO authenticated
  USING (ea_user_id = auth.uid());

-- No INSERT / UPDATE / DELETE for authenticated role — service_role only.


-- ---------------------------------------------------------------------------
-- 2. is_ea_for_client(p_schema) — SECURITY DEFINER so RLS policies on ea_*
--    tables can call it without triggering recursive RLS evaluation on ea_clients.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_ea_for_client(p_schema text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ea_clients
    WHERE  ea_user_id    = auth.uid()
    AND    client_schema = p_schema
  );
$$;

REVOKE ALL     ON FUNCTION public.is_ea_for_client(text) FROM public;
GRANT  EXECUTE ON FUNCTION public.is_ea_for_client(text) TO   authenticated;


-- ---------------------------------------------------------------------------
-- 3. ea_signup_requests — self-service EA signup queue; Vishal approves
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ea_signup_requests (
  id               bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supabase_user_id uuid,                        -- auth.users id created at signup time
  full_name        text        NOT NULL,
  firm_name        text,
  email            text        NOT NULL,
  status           text        NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by      text,
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- No authenticated-role access: service_role only (backend writes, Vishal reads via dashboard).
ALTER TABLE public.ea_signup_requests ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 4. Seed Cliff's assignment
--    Run this and verify the SELECT below returns exactly 1 row before Step 5.
-- ---------------------------------------------------------------------------
INSERT INTO public.ea_clients (ea_user_id, client_schema, assigned_by)
SELECT u.id, 'groundstack', 'vishal@desiredlabs.ai'
FROM   auth.users u
WHERE  u.email = 'cliff@bmb.associates'
ON CONFLICT (ea_user_id, client_schema) DO NOTHING;

-- VERIFY before proceeding to Step 5:
-- SELECT ea_user_id, client_schema, assigned_at FROM public.ea_clients;
-- Expected: 1 row with client_schema = 'groundstack'


-- ---------------------------------------------------------------------------
-- 5. Tighten RLS on ea_* tables — add per-client isolation
--
-- STOP: only run this block after confirming Step 4 returned 1 row.
--
-- Previous policy: any is_ea() user could touch any client's rows.
-- New policy:      is_ea() AND is_ea_for_client(client_schema).
--
-- This is safe for Cliff because his groundstack row was seeded in Step 4.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS ea_flags_rw ON public.ea_flags;
CREATE POLICY ea_flags_rw ON public.ea_flags
  FOR ALL TO authenticated
  USING     (public.is_ea() AND public.is_ea_for_client(client_schema))
  WITH CHECK (public.is_ea() AND public.is_ea_for_client(client_schema));

DROP POLICY IF EXISTS ea_approvals_rw ON public.ea_approvals;
CREATE POLICY ea_approvals_rw ON public.ea_approvals
  FOR ALL TO authenticated
  USING     (public.is_ea() AND public.is_ea_for_client(client_schema))
  WITH CHECK (public.is_ea() AND public.is_ea_for_client(client_schema));

DROP POLICY IF EXISTS ea_category_overrides_rw ON public.ea_category_overrides;
CREATE POLICY ea_category_overrides_rw ON public.ea_category_overrides
  FOR ALL TO authenticated
  USING     (public.is_ea() AND public.is_ea_for_client(client_schema))
  WITH CHECK (public.is_ea() AND public.is_ea_for_client(client_schema));

DROP POLICY IF EXISTS ea_notes_rw ON public.ea_notes;
CREATE POLICY ea_notes_rw ON public.ea_notes
  FOR ALL TO authenticated
  USING     (public.is_ea() AND public.is_ea_for_client(client_schema))
  WITH CHECK (public.is_ea() AND public.is_ea_for_client(client_schema));
