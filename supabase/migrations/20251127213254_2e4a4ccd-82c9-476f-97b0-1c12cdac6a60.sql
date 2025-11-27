-- Create table for WebRTC signaling
CREATE TABLE public.call_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  signal_type TEXT NOT NULL, -- 'offer', 'answer', 'ice-candidate', 'call-end', 'call-reject'
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- Users can view signals meant for them
CREATE POLICY "Users can view their call signals"
ON public.call_signals
FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Users can create signals
CREATE POLICY "Users can create call signals"
ON public.call_signals
FOR INSERT
WITH CHECK (auth.uid() = caller_id);

-- Users can delete signals they're part of
CREATE POLICY "Users can delete their call signals"
ON public.call_signals
FOR DELETE
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Enable realtime for call signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;

-- Auto-delete old signals (cleanup)
CREATE OR REPLACE FUNCTION public.cleanup_old_call_signals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.call_signals WHERE created_at < now() - interval '5 minutes';
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_call_signals_trigger
AFTER INSERT ON public.call_signals
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_call_signals();