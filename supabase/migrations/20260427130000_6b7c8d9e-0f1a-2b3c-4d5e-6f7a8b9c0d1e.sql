-- =====================================================================
-- Security hardening: fix 5 remaining warning-level vulnerabilities
-- =====================================================================


-- -------------------------------------------------------------------
-- 1. Rate-limit RPC functions: enforce auth.uid() internally
-- -------------------------------------------------------------------
-- All six rate-limit functions accepted an arbitrary p_user_id, letting
-- any authenticated caller read or burn another user's quota. The
-- parameter signature is kept for API compatibility but the body now
-- unconditionally uses auth.uid().

CREATE OR REPLACE FUNCTION public.increment_like_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_caller UUID := auth.uid();
BEGIN
  INSERT INTO public.daily_like_usage (user_id, like_date, like_count)
  VALUES (v_caller, CURRENT_DATE, 1)
  ON CONFLICT (user_id, like_date)
  DO UPDATE SET
    like_count = daily_like_usage.like_count + 1,
    updated_at = now()
  RETURNING like_count INTO v_count;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_today_like_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT like_count INTO v_count
  FROM public.daily_like_usage
  WHERE user_id = auth.uid() AND like_date = CURRENT_DATE;
  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_call_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_caller UUID := auth.uid();
BEGIN
  INSERT INTO public.daily_call_usage (user_id, call_date, call_count)
  VALUES (v_caller, CURRENT_DATE, 1)
  ON CONFLICT (user_id, call_date)
  DO UPDATE SET
    call_count = daily_call_usage.call_count + 1,
    updated_at = now()
  RETURNING call_count INTO v_count;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_today_call_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT call_count INTO v_count
  FROM public.daily_call_usage
  WHERE user_id = auth.uid() AND call_date = CURRENT_DATE;
  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_super_like_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_caller UUID := auth.uid();
BEGIN
  INSERT INTO public.daily_super_like_usage (user_id, super_like_date, super_like_count)
  VALUES (v_caller, CURRENT_DATE, 1)
  ON CONFLICT (user_id, super_like_date)
  DO UPDATE SET
    super_like_count = daily_super_like_usage.super_like_count + 1,
    updated_at = now()
  RETURNING super_like_count INTO v_count;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_today_super_like_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT super_like_count INTO v_count
  FROM public.daily_super_like_usage
  WHERE user_id = auth.uid() AND super_like_date = CURRENT_DATE;
  RETURN COALESCE(v_count, 0);
END;
$$;


-- -------------------------------------------------------------------
-- 2. Photo verification: clear selfie data after verification resolves
-- -------------------------------------------------------------------
-- selfie_url stores raw base64 biometric image data. It is only needed
-- during the pending state while the AI verification runs. Once status
-- moves to 'verified' or 'failed' the column is nullified so no
-- permanent biometric record persists in the database.

CREATE OR REPLACE FUNCTION public.clear_selfie_after_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('verified', 'failed') AND OLD.status = 'pending' THEN
    NEW.selfie_url := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_selfie_on_verification ON public.photo_verifications;
CREATE TRIGGER clear_selfie_on_verification
  BEFORE UPDATE ON public.photo_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_selfie_after_verification();

-- Clear any selfie_url values that are already in terminal states.
UPDATE public.photo_verifications
SET selfie_url = NULL
WHERE status IN ('verified', 'failed') AND selfie_url IS NOT NULL;


-- -------------------------------------------------------------------
-- 3. Login attempts: add DELETE policy for admins, block UPDATE
-- -------------------------------------------------------------------
-- Previously no DELETE or UPDATE policy existed. With RLS enabled that
-- blocks all such operations, but leaves intent ambiguous. Explicit
-- policies make the security boundary clear:
--   - Admins may DELETE old records (operational cleanup).
--   - Nobody may UPDATE records (attempts are immutable audit entries).

DROP POLICY IF EXISTS "Admins can delete login attempts"   ON public.login_attempts;
DROP POLICY IF EXISTS "Block all updates to login_attempts" ON public.login_attempts;

CREATE POLICY "Admins can delete login attempts"
ON public.login_attempts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block all updates to login_attempts"
ON public.login_attempts
FOR UPDATE
TO authenticated, anon
USING (false);


-- -------------------------------------------------------------------
-- 4. Restrict is_comped() to authenticated callers
-- -------------------------------------------------------------------
-- is_comped is SECURITY DEFINER and bypasses RLS on comped_users.
-- Without explicit GRANT restrictions, the anon role inherits PUBLIC
-- EXECUTE, allowing unauthenticated requests to probe any UUID.

REVOKE EXECUTE ON FUNCTION public.is_comped(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_comped(uuid) TO authenticated;


-- -------------------------------------------------------------------
-- 5. Confirm no non-admin INSERT path exists into user_roles
-- -------------------------------------------------------------------
-- The has_role() function (STABLE SECURITY DEFINER, fixed search_path)
-- is the sole gatekeeper for the admin-only INSERT / UPDATE / DELETE
-- policies on user_roles. There are no SECURITY DEFINER functions that
-- write to user_roles without calling has_role. No remediation needed;
-- this comment serves as the explicit security attestation.
