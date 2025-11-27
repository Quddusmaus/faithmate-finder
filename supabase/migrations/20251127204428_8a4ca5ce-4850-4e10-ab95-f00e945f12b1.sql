-- Create blocked_users table
CREATE TABLE public.blocked_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks
CREATE POLICY "Users can view their own blocks"
ON public.blocked_users
FOR SELECT
USING (auth.uid() = blocker_id);

-- Users can block others
CREATE POLICY "Users can block others"
ON public.blocked_users
FOR INSERT
WITH CHECK (auth.uid() = blocker_id AND auth.uid() != blocked_id);

-- Users can unblock
CREATE POLICY "Users can unblock"
ON public.blocked_users
FOR DELETE
USING (auth.uid() = blocker_id);

-- Create function to check if user is blocked
CREATE OR REPLACE FUNCTION public.is_blocked(checker_id uuid, target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = checker_id AND blocked_id = target_id)
       OR (blocker_id = target_id AND blocked_id = checker_id)
  )
$$;

-- Update profiles RLS to exclude blocked users
DROP POLICY IF EXISTS "Profiles are viewable based on visibility" ON public.profiles;

CREATE POLICY "Profiles are viewable based on visibility"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = user_id) 
  OR (
    is_visible = true 
    AND status = 'active' 
    AND (suspended_until IS NULL OR suspended_until < now())
    AND NOT is_blocked(auth.uid(), user_id)
  )
);