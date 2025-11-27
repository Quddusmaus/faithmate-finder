-- Update the notify_on_like function to also detect matches
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
BEGIN
  -- Get the name of the user who liked
  SELECT name INTO liker_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Create notification for the liked user
  INSERT INTO public.notifications (user_id, type, title, message, related_user_id)
  VALUES (
    NEW.liked_user_id,
    'like',
    'New Like!',
    COALESCE(liker_name, 'Someone') || ' liked your profile',
    NEW.user_id
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
  END IF;
  
  RETURN NEW;
END;
$$;