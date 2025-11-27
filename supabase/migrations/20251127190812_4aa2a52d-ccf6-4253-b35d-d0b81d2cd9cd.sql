-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all likes" ON public.likes;

-- Create a new restrictive policy that only allows users to see likes they sent or received
CREATE POLICY "Users can view their own likes"
ON public.likes
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = liked_user_id);