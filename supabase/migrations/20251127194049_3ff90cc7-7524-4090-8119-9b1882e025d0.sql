-- Add visibility column to profiles table
ALTER TABLE public.profiles ADD COLUMN is_visible boolean NOT NULL DEFAULT true;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Create new policy that respects privacy setting
-- Users can see: their own profile OR profiles that are visible
CREATE POLICY "Profiles are viewable based on visibility"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR is_visible = true
);