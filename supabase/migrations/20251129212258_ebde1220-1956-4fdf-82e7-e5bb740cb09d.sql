-- Create daily like usage table
CREATE TABLE public.daily_like_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  like_date DATE NOT NULL DEFAULT CURRENT_DATE,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, like_date)
);

-- Enable RLS
ALTER TABLE public.daily_like_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own like usage"
ON public.daily_like_usage
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own like usage"
ON public.daily_like_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own like usage"
ON public.daily_like_usage
FOR UPDATE
USING (auth.uid() = user_id);

-- Function to get today's like count
CREATE OR REPLACE FUNCTION public.get_today_like_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT like_count INTO v_count
  FROM public.daily_like_usage
  WHERE user_id = p_user_id AND like_date = CURRENT_DATE;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to increment like count
CREATE OR REPLACE FUNCTION public.increment_like_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.daily_like_usage (user_id, like_date, like_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, like_date)
  DO UPDATE SET 
    like_count = daily_like_usage.like_count + 1,
    updated_at = now()
  RETURNING like_count INTO v_count;
  
  RETURN v_count;
END;
$$;