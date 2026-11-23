-- Push notification tokens for the iOS / Android app.
--
-- Each row is one device that can receive push notifications for one member.
-- The app registers its token through register_push_token() after sign-in and
-- removes it through unregister_push_token() before sign-out. Sending (from the
-- existing match/message notification triggers) is a later step; it reads this
-- table with the service role.
--
-- iOS rows hold an APNs device token, Android rows an FCM registration token.

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Deleting the sign-in account (delete-account function) removes the rows.
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE CHECK (length(token) BETWEEN 1 AND 4096),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON public.push_tokens (user_id);

-- Members can see their own devices; all writes go through the functions below
-- (a device that changes hands must move to the new member, which a plain
-- RLS upsert can't do because the old row belongs to someone else).
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_tokens FROM anon, authenticated;
GRANT SELECT ON public.push_tokens TO authenticated;

DROP POLICY IF EXISTS "Members see their own push tokens" ON public.push_tokens;
CREATE POLICY "Members see their own push tokens"
  ON public.push_tokens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Save this device's token for the signed-in member (moves it from whoever
-- had it before, e.g. after someone else signed in on the same phone).
CREATE OR REPLACE FUNCTION public.register_push_token(p_token text, p_platform text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;
  IF p_platform NOT IN ('ios', 'android') THEN
    RAISE EXCEPTION 'unknown platform %', p_platform USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.push_tokens (user_id, token, platform)
  VALUES (auth.uid(), p_token, p_platform)
  ON CONFLICT (token) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        updated_at = now();
END;
$$;

-- Forget this device's token for the signed-in member (called before sign-out).
CREATE OR REPLACE FUNCTION public.unregister_push_token(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.push_tokens WHERE token = p_token AND user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.register_push_token(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unregister_push_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_push_token(text) TO authenticated;
