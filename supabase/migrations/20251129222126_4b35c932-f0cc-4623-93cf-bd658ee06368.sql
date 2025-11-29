-- Create super_likes table
CREATE TABLE public.super_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  super_liked_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, super_liked_user_id)
);

-- Create daily_super_like_usage table to track limits
CREATE TABLE public.daily_super_like_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  super_like_date date NOT NULL DEFAULT CURRENT_DATE,
  super_like_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, super_like_date)
);

-- Enable RLS
ALTER TABLE public.super_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_super_like_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for super_likes
CREATE POLICY "Users can create their own super likes"
ON public.super_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view super likes they sent or received"
ON public.super_likes FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = super_liked_user_id);

CREATE POLICY "Users can delete their own super likes"
ON public.super_likes FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for daily_super_like_usage
CREATE POLICY "Users can view their own super like usage"
ON public.daily_super_like_usage FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own super like usage"
ON public.daily_super_like_usage FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own super like usage"
ON public.daily_super_like_usage FOR UPDATE
USING (auth.uid() = user_id);

-- Function to get today's super like count
CREATE OR REPLACE FUNCTION public.get_today_super_like_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT super_like_count INTO v_count
  FROM public.daily_super_like_usage
  WHERE user_id = p_user_id AND super_like_date = CURRENT_DATE;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to increment super like count
CREATE OR REPLACE FUNCTION public.increment_super_like_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.daily_super_like_usage (user_id, super_like_date, super_like_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, super_like_date)
  DO UPDATE SET 
    super_like_count = daily_super_like_usage.super_like_count + 1,
    updated_at = now()
  RETURNING super_like_count INTO v_count;
  
  RETURN v_count;
END;
$$;

-- Trigger function to notify on super like and create regular like
CREATE OR REPLACE FUNCTION public.notify_on_super_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  liker_name text;
  supabase_url text;
BEGIN
  -- Get the Supabase URL
  supabase_url := current_setting('app.settings.supabase_url', true);
  IF supabase_url IS NULL THEN
    supabase_url := 'https://nyhlwamvqjmaxpmqxzah.supabase.co';
  END IF;

  -- Get the name of the user who super liked
  SELECT name INTO liker_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Create special notification for super like
  INSERT INTO public.notifications (user_id, type, title, message, related_user_id)
  VALUES (
    NEW.super_liked_user_id,
    'super_like',
    '⭐ Super Like!',
    COALESCE(liker_name, 'Someone') || ' sent you a Super Like!',
    NEW.user_id
  );
  
  -- Also create a regular like entry so matching still works
  INSERT INTO public.likes (user_id, liked_user_id)
  VALUES (NEW.user_id, NEW.super_liked_user_id)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger for super like notifications
CREATE TRIGGER on_super_like_created
  AFTER INSERT ON public.super_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_super_like();