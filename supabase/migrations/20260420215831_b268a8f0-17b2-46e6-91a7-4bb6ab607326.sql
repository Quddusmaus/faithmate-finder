
-- 1. Restrict Realtime channel subscriptions to user's own topics
-- Topic naming convention: must contain the authenticated user's UUID
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can subscribe to their own channels" ON realtime.messages;
CREATE POLICY "Users can subscribe to their own channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow Postgres-changes broadcasts (topic starts with 'realtime:') 
  -- and user-specific channels containing their uid
  (extension = 'postgres_changes')
  OR (topic LIKE '%' || auth.uid()::text || '%')
);

DROP POLICY IF EXISTS "Users can publish to their own channels" ON realtime.messages;
CREATE POLICY "Users can publish to their own channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  topic LIKE '%' || auth.uid()::text || '%'
);

-- 2. Remove error_logs from realtime publication (sensitive debug data)
ALTER PUBLICATION supabase_realtime DROP TABLE public.error_logs;

-- 3. login_attempts: explicitly block all client INSERTs.
-- Inserts happen only via record_login_attempt() SECURITY DEFINER function.
DROP POLICY IF EXISTS "Block client inserts on login_attempts" ON public.login_attempts;
CREATE POLICY "Block client inserts on login_attempts"
ON public.login_attempts
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- 4. Rate-limiting tables: remove client-side INSERT/UPDATE.
-- Counters are managed exclusively by SECURITY DEFINER RPC functions.
DROP POLICY IF EXISTS "Users can insert their own like usage" ON public.daily_like_usage;
DROP POLICY IF EXISTS "Users can update their own like usage" ON public.daily_like_usage;

DROP POLICY IF EXISTS "Users can insert their own call usage" ON public.daily_call_usage;
DROP POLICY IF EXISTS "Users can update their own call usage" ON public.daily_call_usage;

DROP POLICY IF EXISTS "Users can insert their own super like usage" ON public.daily_super_like_usage;
DROP POLICY IF EXISTS "Users can update their own super like usage" ON public.daily_super_like_usage;

-- SELECT policies remain so users can read their own counts via the get_today_*_count RPCs / direct reads.

-- 5. user_roles: replace broad ALL policy with explicit per-command admin policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
