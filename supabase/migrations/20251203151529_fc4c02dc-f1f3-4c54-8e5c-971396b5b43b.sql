-- First, drop the dependent policy
DROP POLICY IF EXISTS "Users can only message their matches" ON public.messages;

-- Drop the existing matches view
DROP VIEW IF EXISTS public.matches;

-- Create a security barrier view that restricts access to user's own matches only
CREATE VIEW public.matches WITH (security_barrier = true) AS
SELECT 
  l1.user_id as user1_id,
  l2.user_id as user2_id,
  GREATEST(l1.created_at, l2.created_at) as matched_at
FROM public.likes l1
INNER JOIN public.likes l2 
  ON l1.user_id = l2.liked_user_id 
  AND l1.liked_user_id = l2.user_id
  AND l1.user_id < l2.user_id
WHERE auth.uid() = l1.user_id OR auth.uid() = l2.user_id;

-- Recreate the messages policy
CREATE POLICY "Users can only message their matches"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE (m.user1_id = auth.uid() AND m.user2_id = messages.receiver_id)
       OR (m.user2_id = auth.uid() AND m.user1_id = messages.receiver_id)
  )
);