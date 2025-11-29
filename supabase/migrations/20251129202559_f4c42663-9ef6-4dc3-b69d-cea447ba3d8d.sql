-- Create table to track daily call usage
CREATE TABLE public.daily_call_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, call_date)
);

-- Enable RLS
ALTER TABLE public.daily_call_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own call usage"
ON public.daily_call_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert their own call usage"
ON public.daily_call_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage
CREATE POLICY "Users can update their own call usage"
ON public.daily_call_usage
FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to increment call count
CREATE OR REPLACE FUNCTION public.increment_call_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.daily_call_usage (user_id, call_date, call_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, call_date)
  DO UPDATE SET 
    call_count = daily_call_usage.call_count + 1,
    updated_at = now()
  RETURNING call_count INTO v_count;
  
  RETURN v_count;
END;
$$;

-- Create function to get today's call count
CREATE OR REPLACE FUNCTION public.get_today_call_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT call_count INTO v_count
  FROM public.daily_call_usage
  WHERE user_id = p_user_id AND call_date = CURRENT_DATE;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_daily_call_usage_updated_at
BEFORE UPDATE ON public.daily_call_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();