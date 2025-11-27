-- Update notify_on_like function to handle HTTP errors gracefully
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Try to send email notification for the like (don't fail if it doesn't work)
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send like notification email: %', SQLERRM;
  END;
  
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
    
    -- Try to send email for match to user who just liked
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send match email to liker: %', SQLERRM;
    END;
    
    -- Try to send email for match to other user
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send match email to liked user: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;