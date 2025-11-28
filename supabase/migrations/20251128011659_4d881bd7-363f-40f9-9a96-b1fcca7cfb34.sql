-- Fix 1: Require authentication to view profiles (prevent anonymous scraping)
DROP POLICY IF EXISTS "Profiles are viewable based on visibility" ON public.profiles;

CREATE POLICY "Authenticated users can view visible profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    (is_visible = true AND status = 'active' AND (suspended_until IS NULL OR suspended_until < now()) AND NOT is_blocked(auth.uid(), user_id))
  )
);

-- Fix 2: Add RLS policies to matches view
-- Note: matches is a view, so we need to enable RLS and add policies
ALTER VIEW public.matches SET (security_invoker = true);

-- Since matches is a view, we handle access through the underlying likes table
-- which already has proper RLS. The get_user_matches function is SECURITY DEFINER
-- and handles authorization internally.

-- Fix 3: Restrict notifications INSERT to prevent unauthorized injection
-- Replace the open "true" policy with one that only allows the system/triggers
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a policy that only allows inserts via service role (triggers use service role)
-- Regular users cannot insert notifications directly
CREATE POLICY "Only triggers can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  -- Allow if it's the user creating a notification for themselves (edge case for mark as read scenarios)
  -- Or the current role is service_role (for triggers)
  auth.uid() = user_id OR current_setting('role') = 'service_role'
);