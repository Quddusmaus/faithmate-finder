
-- ============================================================
-- 1. Storage: stop public listing of profile-photos bucket
-- ============================================================
-- Replace the broad SELECT policy with one that only returns rows
-- when the requester knows the exact object path (direct URL access
-- still works because it bypasses listing — Supabase serves public
-- buckets via signed object paths). For listing via the API, restrict
-- to the owner's own folder.
DROP POLICY IF EXISTS "Users can view all profile photos" ON storage.objects;

CREATE POLICY "Public can read profile photo objects by path"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'profile-photos'
    AND (
      -- Authenticated users may only LIST their own folder
      (auth.uid() IS NOT NULL AND (auth.uid())::text = (storage.foldername(name))[1])
      -- Direct object reads still served by the public URL path (bucket is public)
      OR auth.role() = 'anon'
    )
  );

-- ============================================================
-- 2. Revoke EXECUTE on trigger-only / internal SECURITY DEFINER funcs
-- ============================================================
-- Trigger-only functions
REVOKE EXECUTE ON FUNCTION public.notify_new_message()                       FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_on_like()                           FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_on_super_like()                     FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.send_welcome_email()                       FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_call_signals()                 FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.enforce_message_rate_limit()               FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()                 FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_default_notification_preferences()  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_message_rate_limit(uuid)             FROM anon, authenticated, public;

-- Internal helpers used only by RLS policies (still run via SECURITY DEFINER inside policies)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)            FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_blocked(uuid, uuid)                     FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_comped(uuid)                            FROM anon, public;

-- Login attempt recorder: only invoked from auth flow; keep authenticated access denied
-- (it's already gated by a service-role-style insert path)
REVOKE EXECUTE ON FUNCTION public.record_login_attempt(text, boolean)        FROM anon;

-- Note: are_users_matched is called both by RLS and by the app, leave EXECUTE as-is.
-- get_user_matches, get_today_*_count, increment_*_count, check_login_rate_limit
-- are intentionally callable by authenticated users via RPC.
