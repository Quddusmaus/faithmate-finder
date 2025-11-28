-- Drop existing policies
DROP POLICY IF EXISTS "Users can create call signals" ON public.call_signals;
DROP POLICY IF EXISTS "Users can view their call signals" ON public.call_signals;
DROP POLICY IF EXISTS "Users can delete their call signals" ON public.call_signals;

-- Create a function to check if two users are matched
CREATE OR REPLACE FUNCTION public.are_users_matched(user1_id uuid, user2_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.matches
    WHERE (user1_id = matches.user1_id AND user2_id = matches.user2_id)
       OR (user1_id = matches.user2_id AND user2_id = matches.user1_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create new INSERT policy - authenticated users can send signals to their matches
CREATE POLICY "Authenticated users can create call signals to matches"
ON public.call_signals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = caller_id 
  AND are_users_matched(caller_id, receiver_id)
);

-- Create new SELECT policy - users can view signals they're part of
CREATE POLICY "Users can view their call signals"
ON public.call_signals
FOR SELECT
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Create new DELETE policy - users can delete signals they're part of
CREATE POLICY "Users can delete their call signals"
ON public.call_signals
FOR DELETE
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);