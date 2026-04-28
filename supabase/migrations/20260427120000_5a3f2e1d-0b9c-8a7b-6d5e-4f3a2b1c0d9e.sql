-- =====================================================================
-- Security hardening: definitive fix for all 5 vulnerability classes
-- =====================================================================
-- Every section uses DROP IF EXISTS before CREATE so the migration is
-- safe to apply regardless of which earlier partial fixes are present.
-- =====================================================================


-- -------------------------------------------------------------------
-- 1. Realtime channel subscription policy
-- -------------------------------------------------------------------
-- Previous policies (20260420215831, 20260422014140) left
-- postgres_changes extension unconditionally allowed due to operator
-- precedence. The USING clause evaluated as:
--
--   ((broadcast OR presence) AND topic_has_uid) OR postgres_changes
--
-- so any authenticated user could subscribe to postgres_changes on
-- ANY table, exposing change-timing metadata even when row-level RLS
-- would have filtered the payload.
--
-- Fix: all extension types now require the caller's UUID in the
-- channel topic. App channels that were missing the UID (see
-- useUnreadMessageCount.ts and ChatWindow.tsx) are updated in the
-- same commit.

DROP POLICY IF EXISTS "Users can subscribe to their own channels"       ON realtime.messages;
DROP POLICY IF EXISTS "Users can publish to their own channels"         ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can use realtime extensions" ON realtime.messages;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Subscribe (receive events): channel topic must contain the caller's UUID.
CREATE POLICY "Users can subscribe to their own channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (topic LIKE '%' || (auth.uid())::text || '%');

-- Publish (broadcast / presence track): same UID requirement.
CREATE POLICY "Users can publish to their own channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (topic LIKE '%' || (auth.uid())::text || '%');


-- -------------------------------------------------------------------
-- 2. Remove error_logs from the Realtime publication
-- -------------------------------------------------------------------
-- Streaming internal debug data (stack traces, request bodies, raw
-- errors) via Realtime exposes application internals to any subscriber.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname    = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'error_logs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.error_logs';
  END IF;
END $$;


-- -------------------------------------------------------------------
-- 3. Block all direct writes to login_attempts
-- -------------------------------------------------------------------
-- The table was created with "Anyone can log attempts" (WITH CHECK (true)),
-- allowing any client — including unauthenticated — to inject arbitrary
-- login-attempt records. This poisoned the rate-limit signal and enabled
-- DoS via fabricated lockout records.
--
-- Writes are now gated exclusively by the record_login_attempt()
-- SECURITY DEFINER function, which runs as the function owner and
-- therefore bypasses RLS intentionally.

DROP POLICY IF EXISTS "Anyone can log attempts"                ON public.login_attempts;
DROP POLICY IF EXISTS "Block client inserts on login_attempts" ON public.login_attempts;

CREATE POLICY "Block client inserts on login_attempts"
ON public.login_attempts
FOR INSERT
TO authenticated, anon
WITH CHECK (false);


-- -------------------------------------------------------------------
-- 4. Lock down rate-limit counters
-- -------------------------------------------------------------------
-- The original per-user INSERT / UPDATE policies on daily_like_usage,
-- daily_call_usage, and daily_super_like_usage let users directly reset
-- or inflate their own counters, bypassing all rate-limit enforcement.
--
-- All mutations are handled exclusively by SECURITY DEFINER RPC
-- functions (increment_like_count, increment_call_count, etc.) which
-- run with elevated privileges. Clients only need SELECT to display
-- remaining quota; those policies are left intact.

DROP POLICY IF EXISTS "Users can insert their own like usage"       ON public.daily_like_usage;
DROP POLICY IF EXISTS "Users can update their own like usage"       ON public.daily_like_usage;

DROP POLICY IF EXISTS "Users can insert their own call usage"       ON public.daily_call_usage;
DROP POLICY IF EXISTS "Users can update their own call usage"       ON public.daily_call_usage;

DROP POLICY IF EXISTS "Users can insert their own super like usage" ON public.daily_super_like_usage;
DROP POLICY IF EXISTS "Users can update their own super like usage" ON public.daily_super_like_usage;


-- -------------------------------------------------------------------
-- 5. Restrict user_roles writes to admins only
-- -------------------------------------------------------------------
-- The original "Admins can manage roles" FOR ALL policy was overly broad
-- and was only replaced by per-command variants in a later migration.
-- Drop the broad policy explicitly here (idempotent) and recreate the
-- per-command admin policies so this migration is the single source of
-- truth regardless of which earlier patches ran.
--
-- Non-admin users retain SELECT on their own row (from the initial
-- migration "Users can view their own roles") and nothing else.

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING   (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
