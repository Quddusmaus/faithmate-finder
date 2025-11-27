-- Enable the pg_net extension for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Update the notify_on_like function to also send email notifications
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  liker_name text;
  liked_user_name text;
  is_mutual boolean;
  supabase_url text;
BEGIN
  -- Get the Supabase URL from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  IF supabase_url IS NULL THEN
    supabase_url := 'https://nyhlwamvqjmaxpmqxzah.supabase.co';
  END IF;

  -- Get the name of the user who liked
  SELECT name INTO liker_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Create in-app notification for the liked user
  INSERT INTO public.notifications (user_id, type, title, message, related_user_id)
  VALUES (
    NEW.liked_user_id,
    'like',
    'New Like!',
    COALESCE(liker_name, 'Someone') || ' liked your profile',
    NEW.user_id
  );
  
  -- Send email notification for the like
  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/send-notification-email',
    body := jsonb_build_object(
      'type', 'like',
      'recipient_user_id', NEW.liked_user_id,
      'sender_name', COALESCE(liker_name, 'Someone'),
      'sender_user_id', NEW.user_id
    )::text,
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  
  -- Check if this creates a mutual match
  SELECT EXISTS (
    SELECT 1 FROM public.likes
    WHERE user_id = NEW.liked_user_id
    AND liked_user_id = NEW.user_id
  ) INTO is_mutual;
  
  -- If mutual, send match notifications to both users
  IF is_mutual THEN
    -- Get the name of the liked user
    SELECT name INTO liked_user_name
    FROM public.profiles
    WHERE user_id = NEW.liked_user_id;
    
    -- Notify the user who just liked (they matched!)
    INSERT INTO public.notifications (user_id, type, title, message, related_user_id)
    VALUES (
      NEW.user_id,
      'match',
      'New Match! 🎉',
      'You matched with ' || COALESCE(liked_user_name, 'someone') || '! Start a conversation.',
      NEW.liked_user_id
    );
    
    -- Notify the other user (they matched too!)
    INSERT INTO public.notifications (user_id, type, title, message, related_user_id)
    VALUES (
      NEW.liked_user_id,
      'match',
      'New Match! 🎉',
      'You matched with ' || COALESCE(liker_name, 'someone') || '! Start a conversation.',
      NEW.user_id
    );
    
    -- Send email for match to user who just liked
    PERFORM extensions.http_post(
      url := supabase_url || '/functions/v1/send-notification-email',
      body := jsonb_build_object(
        'type', 'match',
        'recipient_user_id', NEW.user_id,
        'sender_name', COALESCE(liked_user_name, 'Someone'),
        'sender_user_id', NEW.liked_user_id
      )::text,
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
    
    -- Send email for match to other user
    PERFORM extensions.http_post(
      url := supabase_url || '/functions/v1/send-notification-email',
      body := jsonb_build_object(
        'type', 'match',
        'recipient_user_id', NEW.liked_user_id,
        'sender_name', COALESCE(liker_name, 'Someone'),
        'sender_user_id', NEW.user_id
      )::text,
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  END IF;
  
  RETURN NEW;
END;
$$;