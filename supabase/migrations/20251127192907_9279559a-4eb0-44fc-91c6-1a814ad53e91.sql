-- First, drop the dependent policy on messages table that references the matches view
DROP POLICY IF EXISTS "Users can only message their matches" ON public.messages;

-- Drop the existing matches view (which has SECURITY DEFINER by default)
DROP VIEW IF EXISTS public.matches;

-- Recreate the matches view with SECURITY INVOKER to respect RLS
CREATE VIEW public.matches
WITH (security_invoker = true)
AS
SELECT DISTINCT 
    LEAST(l1.user_id, l1.liked_user_id) AS user1_id,
    GREATEST(l1.user_id, l1.liked_user_id) AS user2_id,
    LEAST(l1.created_at, l2.created_at) AS matched_at
FROM likes l1
JOIN likes l2 ON l1.user_id = l2.liked_user_id AND l1.liked_user_id = l2.user_id;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.matches TO authenticated;

-- Recreate the messages policy that depends on the matches view
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