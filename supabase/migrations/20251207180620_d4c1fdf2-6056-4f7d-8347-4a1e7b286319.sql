-- Remove the overly permissive INSERT policy
-- Inserts will still work through the record_login_attempt SECURITY DEFINER function
DROP POLICY IF EXISTS "Anyone can log attempts" ON public.login_attempts;