-- Demo profiles are sample members with no account behind them. Real members
-- and app-store reviewers should not see them in browse, but admins keep them
-- for checking browse and filters (e2e/17-demo-profiles.spec.ts signs in as
-- admin). Rows are kept, so restoring the old policy brings them back.
DROP POLICY IF EXISTS "Authenticated users can view demo profiles" ON public.demo_profiles;
DROP POLICY IF EXISTS "Demo profiles are viewable by everyone" ON public.demo_profiles;
DROP POLICY IF EXISTS "Admins can view demo profiles" ON public.demo_profiles;

CREATE POLICY "Admins can view demo profiles"
ON public.demo_profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
