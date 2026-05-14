-- Remove HTTP calls from notify_on_like and notify_new_message trigger functions.
--
-- Background: Supabase Database Webhooks (e.g. on_like_inserted) now handle
-- delivery to the send-notification-email edge function on INSERT into the
-- relevant tables. The triggers previously also called extensions.http_post
-- themselves, which caused double-fires once the webhooks were added.
--
-- After this migration, the trigger functions only insert notification rows.
-- All outbound email delivery is handled by Database Webhooks:
--   - public.likes      INSERT -> send-notification-email (webhook: on_like_inserted)
--   - public.messages   INSERT -> send-notification-email (TODO: add webhook in dashboard)
--
-- send_welcome_email is intentionally left alone — it still performs the
-- http_post (no webhook exists for that path yet).

CREATE OR REPLACE FUNCTION public.notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sender_name TEXT;
BEGIN
  IF NEW.sender_id != NEW.receiver_id THEN
    SELECT name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;

    INSERT INTO public.notifications (user_id, type, title, message, related_user_id)
    VALUES (
      NEW.receiver_id,
      'message',
      'New Message',
      COALESCE(sender_name, 'Someone') || ' sent you a message',
      NEW.sender_id
    );
  END IF;
  RETURN NEW;
END;
$function$;

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
BEGIN
  SELECT name INTO liker_name FROM public.profiles WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, related_user_id)
  VALUES (
    NEW.liked_user_id,
    'like',
    'New Like!',
    COALESCE(liker_name, 'Someone') || ' liked your profile',
    NEW.user_id
  );

  SELECT EXISTS (
    SELECT 1 FROM public.likes
    WHERE user_id = NEW.liked_user_id AND liked_user_id = NEW.user_id
  ) INTO is_mutual;

  IF is_mutual THEN
    SELECT name INTO liked_user_name FROM public.profiles WHERE user_id = NEW.liked_user_id;

    INSERT INTO public.notifications (user_id, type, title, message, related_user_id)
    VALUES (NEW.user_id, 'match', 'New Match! 🎉',
      'You matched with ' || COALESCE(liked_user_name, 'someone') || '! Start a conversation.',
      NEW.liked_user_id);

    INSERT INTO public.notifications (user_id, type, title, message, related_user_id)
    VALUES (NEW.liked_user_id, 'match', 'New Match! 🎉',
      'You matched with ' || COALESCE(liker_name, 'someone') || '! Start a conversation.',
      NEW.user_id);
  END IF;

  RETURN NEW;
END;
$function$;
