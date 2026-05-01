-- Store the internal webhook secret in vault (idempotent)
DO $$
DECLARE
  v_secret_id uuid;
BEGIN
  SELECT id INTO v_secret_id FROM vault.secrets WHERE name = 'internal_webhook_secret';
  IF v_secret_id IS NULL THEN
    PERFORM vault.create_secret(
      'PLACEHOLDER_WILL_BE_UPDATED',
      'internal_webhook_secret',
      'Used by trigger functions to authenticate to internal edge functions'
    );
  END IF;
END $$;

-- Helper to fetch the secret (SECURITY DEFINER, locked down)
CREATE OR REPLACE FUNCTION public.get_internal_webhook_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, vault
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_webhook_secret' LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_internal_webhook_secret() FROM anon, authenticated, public;

-- Update notify_new_message to read from vault
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
  IF NEW.sender_id != NEW.receiver_id THEN
    BEGIN
      internal_secret := public.get_internal_webhook_secret();
    EXCEPTION WHEN OTHERS THEN
      internal_secret := NULL;
    END;

    SELECT name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;

    INSERT INTO public.notifications (user_id, type, title, message, related_user_id)
    VALUES (
      NEW.receiver_id,
      'message',
      'New Message',
      COALESCE(sender_name, 'Someone') || ' sent you a message',
      NEW.sender_id
    );

    BEGIN
      PERFORM extensions.http_post(
        url := supabase_url || '/functions/v1/send-notification-email',
        body := jsonb_build_object(
          'type', 'message',
          'recipient_user_id', NEW.receiver_id,
          'sender_name', COALESCE(sender_name, 'Someone'),
          'sender_user_id', NEW.sender_id
        )::text,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-internal-secret', COALESCE(internal_secret, '')
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send message notification email: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update notify_on_like
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
  supabase_url text := 'https://nyhlwamvqjmaxpmqxzah.supabase.co';
  internal_secret text;
BEGIN
  BEGIN
    internal_secret := public.get_internal_webhook_secret();
  EXCEPTION WHEN OTHERS THEN
    internal_secret := NULL;
  END;

  SELECT name INTO liker_name FROM public.profiles WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, related_user_id)
  VALUES (
    NEW.liked_user_id,
    'like',
    'New Like!',
    COALESCE(liker_name, 'Someone') || ' liked your profile',
    NEW.user_id
  );

  BEGIN
    PERFORM extensions.http_post(
      url := supabase_url || '/functions/v1/send-notification-email',
      body := jsonb_build_object(
        'type', 'like',
        'recipient_user_id', NEW.liked_user_id,
        'sender_name', COALESCE(liker_name, 'Someone'),
        'sender_user_id', NEW.user_id
      )::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', COALESCE(internal_secret, '')
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send like notification email: %', SQLERRM;
  END;

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

    BEGIN
      PERFORM extensions.http_post(
        url := supabase_url || '/functions/v1/send-notification-email',
        body := jsonb_build_object(
          'type', 'match',
          'recipient_user_id', NEW.user_id,
          'sender_name', COALESCE(liked_user_name, 'Someone'),
          'sender_user_id', NEW.liked_user_id
        )::text,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-internal-secret', COALESCE(internal_secret, '')
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send match email to liker: %', SQLERRM;
    END;

    BEGIN
      PERFORM extensions.http_post(
        url := supabase_url || '/functions/v1/send-notification-email',
        body := jsonb_build_object(
          'type', 'match',
          'recipient_user_id', NEW.liked_user_id,
          'sender_name', COALESCE(liker_name, 'Someone'),
          'sender_user_id', NEW.user_id
        )::text,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-internal-secret', COALESCE(internal_secret, '')
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send match email to liked user: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update send_welcome_email
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
    PERFORM extensions.http_post(
      url := supabase_url || '/functions/v1/send-welcome-email',
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'name', NEW.name
      )::text,
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

REVOKE EXECUTE ON FUNCTION public.notify_new_message() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_on_like() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.send_welcome_email() FROM anon, authenticated, public;