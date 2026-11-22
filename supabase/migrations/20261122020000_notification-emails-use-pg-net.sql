-- Send notification and welcome emails with pg_net (net.http_post), which is
-- what production actually uses.
--
-- 20260928000000 (dedupe notifications) and 20261121000000 (welcome email)
-- call extensions.http_post(url := ..., body := ..., headers := ...). That
-- named-argument form belongs to pg_net's net.http_post; the `http`
-- extension's http_post has different parameters, so the call errors. Each
-- call sits inside EXCEPTION WHEN OTHERS, so emails would silently stop.
-- Production's live notify_new_message already uses net.http_post (checked
-- 2026-11-22), so it was changed outside the repo.
--
-- Same function bodies as those migrations, with only the HTTP call
-- switched to net.http_post (asynchronous, body as jsonb). Run it right after
-- 20260928000000 on any database that gets that migration.

CREATE OR REPLACE FUNCTION public.notify_new_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  sender_name TEXT;
  supabase_url TEXT := 'https://nyhlwamvqjmaxpmqxzah.supabase.co';
  internal_secret TEXT;
BEGIN
  IF NEW.sender_id = NEW.receiver_id THEN
    RETURN NEW;
  END IF;

  SELECT name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, message, related_user_id, event_key)
  VALUES (
    NEW.receiver_id,
    'message',
    'New Message',
    COALESCE(sender_name, 'Someone') || ' sent you a message',
    NEW.sender_id,
    'message:' || NEW.id
  )
  ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;

  -- Already notified for this message: don't email again.
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  BEGIN
    internal_secret := public.get_internal_webhook_secret();
  EXCEPTION WHEN OTHERS THEN
    internal_secret := NULL;
  END;

  BEGIN
    PERFORM net.http_post(
      url     := supabase_url || '/functions/v1/send-notification-email',
      body    := jsonb_build_object(
                   'type',              'message',
                   'recipient_user_id', NEW.receiver_id,
                   'sender_name',       COALESCE(sender_name, 'Someone'),
                   'sender_user_id',    NEW.sender_id
                 ),
      headers := jsonb_build_object(
                   'Content-Type',     'application/json',
                   'x-internal-secret', COALESCE(internal_secret, '')
                 )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_message: failed to call send-notification-email: %', SQLERRM;
  END;

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
  liker_name       text;
  liked_user_name  text;
  is_mutual        boolean;
  liker_matched    boolean;
  liked_matched    boolean;
  supabase_url     text := 'https://nyhlwamvqjmaxpmqxzah.supabase.co';
  internal_secret  text;
BEGIN
  BEGIN
    internal_secret := public.get_internal_webhook_secret();
  EXCEPTION WHEN OTHERS THEN
    internal_secret := NULL;
  END;

  SELECT name INTO liker_name FROM public.profiles WHERE user_id = NEW.user_id;

  -- Notification row for the person who was liked.
  INSERT INTO public.notifications (user_id, type, title, message, related_user_id, event_key)
  VALUES (
    NEW.liked_user_id,
    'like',
    'New Like!',
    COALESCE(liker_name, 'Someone') || ' liked your profile',
    NEW.user_id,
    'like:' || NEW.user_id
  )
  ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;

  -- Email to the person who was liked, only the first time.
  IF FOUND THEN
    BEGIN
      PERFORM net.http_post(
        url     := supabase_url || '/functions/v1/send-notification-email',
        body    := jsonb_build_object(
                     'type',              'like',
                     'recipient_user_id', NEW.liked_user_id,
                     'sender_name',       COALESCE(liker_name, 'Someone'),
                     'sender_user_id',    NEW.user_id
                   ),
        headers := jsonb_build_object(
                     'Content-Type',     'application/json',
                     'x-internal-secret', COALESCE(internal_secret, '')
                   )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_on_like: failed to send like email: %', SQLERRM;
    END;
  END IF;

  -- Check for mutual like (match).
  SELECT EXISTS (
    SELECT 1 FROM public.likes
    WHERE user_id = NEW.liked_user_id AND liked_user_id = NEW.user_id
  ) INTO is_mutual;

  IF is_mutual THEN
    SELECT name INTO liked_user_name FROM public.profiles WHERE user_id = NEW.liked_user_id;

    -- Match notification + email to the person who just liked.
    INSERT INTO public.notifications (user_id, type, title, message, related_user_id, event_key)
    VALUES (
      NEW.user_id, 'match', 'New Match! 🎉',
      'You matched with ' || COALESCE(liked_user_name, 'someone') || '! Start a conversation.',
      NEW.liked_user_id,
      'match:' || NEW.liked_user_id
    )
    ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;
    liker_matched := FOUND;

    IF liker_matched THEN
      BEGIN
        PERFORM net.http_post(
          url     := supabase_url || '/functions/v1/send-notification-email',
          body    := jsonb_build_object(
                       'type',              'match',
                       'recipient_user_id', NEW.user_id,
                       'sender_name',       COALESCE(liked_user_name, 'Someone'),
                       'sender_user_id',    NEW.liked_user_id
                     ),
          headers := jsonb_build_object(
                       'Content-Type',     'application/json',
                       'x-internal-secret', COALESCE(internal_secret, '')
                     )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_on_like: failed to send match email to liker: %', SQLERRM;
      END;
    END IF;

    -- Match notification + email to the person who was liked.
    INSERT INTO public.notifications (user_id, type, title, message, related_user_id, event_key)
    VALUES (
      NEW.liked_user_id, 'match', 'New Match! 🎉',
      'You matched with ' || COALESCE(liker_name, 'someone') || '! Start a conversation.',
      NEW.user_id,
      'match:' || NEW.user_id
    )
    ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;
    liked_matched := FOUND;

    IF liked_matched THEN
      BEGIN
        PERFORM net.http_post(
          url     := supabase_url || '/functions/v1/send-notification-email',
          body    := jsonb_build_object(
                       'type',              'match',
                       'recipient_user_id', NEW.liked_user_id,
                       'sender_name',       COALESCE(liker_name, 'Someone'),
                       'sender_user_id',    NEW.user_id
                     ),
          headers := jsonb_build_object(
                       'Content-Type',     'application/json',
                       'x-internal-secret', COALESCE(internal_secret, '')
                     )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_on_like: failed to send match email to liked user: %', SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_welcome_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url text := 'https://nyhlwamvqjmaxpmqxzah.supabase.co';
  internal_secret text;
BEGIN
  BEGIN
    internal_secret := public.get_internal_webhook_secret();
  EXCEPTION WHEN OTHERS THEN
    internal_secret := NULL;
  END;

  BEGIN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-welcome-email',
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'name', NEW.name
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', COALESCE(internal_secret, '')
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send welcome email: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
