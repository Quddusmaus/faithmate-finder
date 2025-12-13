-- Performance indexes for likes table
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_liked_user_id ON public.likes(liked_user_id);
CREATE INDEX IF NOT EXISTS idx_likes_created_at ON public.likes(created_at DESC);
-- Composite index for match detection (mutual likes)
CREATE INDEX IF NOT EXISTS idx_likes_match_lookup ON public.likes(user_id, liked_user_id);

-- Performance indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
-- Composite index for conversation queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(sender_id, receiver_id, created_at DESC);
-- Index for unread message counts
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(receiver_id, read_at) WHERE read_at IS NULL;

-- Performance indexes for super_likes table
CREATE INDEX IF NOT EXISTS idx_super_likes_user_id ON public.super_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_super_likes_super_liked_user_id ON public.super_likes(super_liked_user_id);

-- Performance indexes for profiles table (for browsing/filtering)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_visible_active ON public.profiles(is_visible, status) WHERE is_visible = true AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender) WHERE is_visible = true AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(location) WHERE is_visible = true AND status = 'active';

-- Performance indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;