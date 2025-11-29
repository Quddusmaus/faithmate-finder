-- Drop the function with CASCADE to remove dependent policies
DROP FUNCTION IF EXISTS public.are_users_matched(uuid, uuid) CASCADE;

-- Recreate the function with unambiguous parameter names
CREATE OR REPLACE FUNCTION public.are_users_matched(p_user1_id uuid, p_user2_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.matches
    WHERE (matches.user1_id = p_user1_id AND matches.user2_id = p_user2_id)
       OR (matches.user1_id = p_user2_id AND matches.user2_id = p_user1_id)
  );
END;
$function$;

-- Recreate the RLS policy for call_signals INSERT
CREATE POLICY "Authenticated users can create call signals to matches"
ON public.call_signals
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = caller_id) AND are_users_matched(caller_id, receiver_id)
);