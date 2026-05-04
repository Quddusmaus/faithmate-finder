DROP POLICY IF EXISTS "Anyone can log errors" ON public.error_logs;

CREATE POLICY "Authenticated users can log errors"
ON public.error_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);