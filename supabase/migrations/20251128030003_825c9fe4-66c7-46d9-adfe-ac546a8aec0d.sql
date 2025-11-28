-- Enable REPLICA IDENTITY FULL for realtime to work with RLS
ALTER TABLE public.messages REPLICA IDENTITY FULL;