-- Drop the dependent policy first
DROP POLICY IF EXISTS "Users can only message their matches" ON public.messages;

-- Drop and recreate matches view with SECURITY INVOKER (uses caller's permissions)
DROP VIEW IF EXISTS public.matches;

-- Create view with security_invoker to use caller's RLS permissions on underlying tables
CREATE VIEW public.matches WITH (security_invoker = true) AS
SELECT 
  l1.user_id as user1_id,
  l2.user_id as user2_id,
  GREATEST(l1.created_at, l2.created_at) as matched_at
FROM public.likes l1
INNER JOIN public.likes l2 
  ON l1.user_id = l2.liked_user_id 
  AND l1.liked_user_id = l2.user_id
  AND l1.user_id < l2.user_id;

-- Recreate the messages policy using the secure are_users_matched function instead
CREATE POLICY "Users can only message their matches"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND are_users_matched(auth.uid(), receiver_id)
);