-- Create likes table to track user interactions
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  liked_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, liked_user_id),
  CHECK (user_id != liked_user_id)
);

-- Create matches view for mutual likes
CREATE VIEW public.matches AS
SELECT DISTINCT
  LEAST(l1.user_id, l1.liked_user_id) as user1_id,
  GREATEST(l1.user_id, l1.liked_user_id) as user2_id,
  LEAST(l1.created_at, l2.created_at) as matched_at
FROM public.likes l1
INNER JOIN public.likes l2 
  ON l1.user_id = l2.liked_user_id 
  AND l1.liked_user_id = l2.user_id;

-- Create messages table for chat
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) <= 2000),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  CHECK (sender_id != receiver_id)
);

-- Create index for faster message queries
CREATE INDEX idx_messages_sender_receiver ON public.messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id, read_at);

-- Enable RLS on likes table
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Likes policies
CREATE POLICY "Users can view all likes"
ON public.likes FOR SELECT
USING (true);

CREATE POLICY "Users can create their own likes"
ON public.likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
ON public.likes FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages policies - only allow messaging between matched users
CREATE POLICY "Users can view messages they sent or received"
ON public.messages FOR SELECT
USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

CREATE POLICY "Users can only message their matches"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE (m.user1_id = auth.uid() AND m.user2_id = receiver_id)
       OR (m.user2_id = auth.uid() AND m.user1_id = receiver_id)
  )
);

CREATE POLICY "Users can update read status on messages they received"
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create function to get user's matches with profile info
CREATE OR REPLACE FUNCTION public.get_user_matches(user_uuid UUID)
RETURNS TABLE (
  match_id UUID,
  matched_at TIMESTAMP WITH TIME ZONE,
  profile_id UUID,
  name TEXT,
  age INTEGER,
  location TEXT,
  photo_urls TEXT[],
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.user2_id as match_id,
    m.matched_at,
    p.id as profile_id,
    p.name,
    p.age,
    p.location,
    p.photo_urls,
    (
      SELECT content 
      FROM public.messages msg
      WHERE (msg.sender_id = user_uuid AND msg.receiver_id = m.user2_id)
         OR (msg.sender_id = m.user2_id AND msg.receiver_id = user_uuid)
      ORDER BY msg.created_at DESC
      LIMIT 1
    ) as last_message,
    (
      SELECT created_at
      FROM public.messages msg
      WHERE (msg.sender_id = user_uuid AND msg.receiver_id = m.user2_id)
         OR (msg.sender_id = m.user2_id AND msg.receiver_id = user_uuid)
      ORDER BY msg.created_at DESC
      LIMIT 1
    ) as last_message_at,
    (
      SELECT COUNT(*)
      FROM public.messages msg
      WHERE msg.sender_id = m.user2_id 
        AND msg.receiver_id = user_uuid
        AND msg.read_at IS NULL
    ) as unread_count
  FROM public.matches m
  INNER JOIN public.profiles p ON p.user_id = m.user2_id
  WHERE m.user1_id = user_uuid
  
  UNION
  
  SELECT 
    m.user1_id as match_id,
    m.matched_at,
    p.id as profile_id,
    p.name,
    p.age,
    p.location,
    p.photo_urls,
    (
      SELECT content
      FROM public.messages msg
      WHERE (msg.sender_id = user_uuid AND msg.receiver_id = m.user1_id)
         OR (msg.sender_id = m.user1_id AND msg.receiver_id = user_uuid)
      ORDER BY msg.created_at DESC
      LIMIT 1
    ) as last_message,
    (
      SELECT created_at
      FROM public.messages msg
      WHERE (msg.sender_id = user_uuid AND msg.receiver_id = m.user1_id)
         OR (msg.sender_id = m.user1_id AND msg.receiver_id = user_uuid)
      ORDER BY msg.created_at DESC
      LIMIT 1
    ) as last_message_at,
    (
      SELECT COUNT(*)
      FROM public.messages msg
      WHERE msg.sender_id = m.user1_id 
        AND msg.receiver_id = user_uuid
        AND msg.read_at IS NULL
    ) as unread_count
  FROM public.matches m
  INNER JOIN public.profiles p ON p.user_id = m.user1_id
  WHERE m.user2_id = user_uuid
  
  ORDER BY last_message_at DESC NULLS LAST;
END;
$$;