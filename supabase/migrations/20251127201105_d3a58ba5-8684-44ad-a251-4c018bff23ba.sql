-- Add suspension/ban fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN status text NOT NULL DEFAULT 'active',
ADD COLUMN suspended_until timestamp with time zone,
ADD COLUMN suspension_reason text;

-- Update RLS policy to hide banned/suspended profiles from other users
DROP POLICY IF EXISTS "Profiles are viewable based on visibility" ON public.profiles;

CREATE POLICY "Profiles are viewable based on visibility" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (is_visible = true AND status = 'active' AND (suspended_until IS NULL OR suspended_until < now()))
);

-- Allow admins to update any profile (for banning)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));