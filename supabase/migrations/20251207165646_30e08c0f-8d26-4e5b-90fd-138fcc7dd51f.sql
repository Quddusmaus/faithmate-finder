-- Restrict demo_profiles to authenticated users only
DROP POLICY IF EXISTS "Demo profiles are viewable by everyone" ON public.demo_profiles;

CREATE POLICY "Authenticated users can view demo profiles"
ON public.demo_profiles FOR SELECT
TO authenticated
USING (true);