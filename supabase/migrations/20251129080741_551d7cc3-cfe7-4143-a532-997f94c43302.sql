-- Create login_attempts table for tracking failed logins
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

-- Create index for efficient lookups
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts (email, attempted_at DESC);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert login attempts (needed for tracking)
CREATE POLICY "Anyone can log attempts" ON public.login_attempts FOR INSERT WITH CHECK (true);

-- Create function to check if login is rate limited (max 5 failed attempts in 15 minutes)
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO failed_count
  FROM public.login_attempts
  WHERE email = p_email
    AND success = false
    AND attempted_at > now() - interval '15 minutes';
  
  RETURN failed_count < 5;
END;
$$;

-- Create function to check message rate limit (max 10 messages per minute)
CREATE OR REPLACE FUNCTION public.check_message_rate_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO msg_count
  FROM public.messages
  WHERE sender_id = p_user_id
    AND created_at > now() - interval '1 minute';
  
  RETURN msg_count < 10;
END;
$$;

-- Create function to record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email TEXT, p_success BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, success)
  VALUES (p_email, p_success);
  
  -- Clean up old attempts (older than 24 hours)
  DELETE FROM public.login_attempts WHERE attempted_at < now() - interval '24 hours';
END;
$$;

-- Add trigger to enforce message rate limit
CREATE OR REPLACE FUNCTION public.enforce_message_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT check_message_rate_limit(NEW.sender_id) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before sending more messages.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_message_rate_limit_trigger
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_message_rate_limit();