-- Restore direct email delivery from DB trigger functions.
--
-- Migration 20260514 removed all http_post calls from notify_on_like and
-- notify_new_message, expecting Supabase Database Webhooks to handle delivery.
-- That approach failed because:
--   1. The messages webhook was never created (marked TODO).
--   2. The likes webhook sends the raw Supabase row payload, which the
--      send-notification-email edge function cannot parse (it expects a
--      hand-shaped JSON body with type/recipient_user_id/sender_name).
--
-- This migration restores the direct extensions.http_post calls inside both
-- trigger functions. If the Database Webhook for likes is still active in the
-- dashboard it will double-fire for likes — delete it there to avoid duplicates.
--
-- REQUIRED ACTION after deploying this migration:
--   Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
--   Ensure these two secrets are set:
--     INTERNAL_WEBHOOK_SECRET  →  run the query below to get the value:
--                                 SELECT decrypted_secret FROM vault.decrypted_secrets
--                                 WHERE name = 'internal_webhook_secret';
--     RESEND_API_KEY           →  your Resend API key from resend.com/api-keys
--
--   If the vault secret does not exist yet, this migration creates one —
--   then copy the generated value into the INTERNAL_WEBHOOK_SECRET edge secret.

-- Ensure the vault secret exists (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'internal_webhook_secret'
  ) THEN
    PERFORM vault.create_secret(
      gen_random_uuid()::text,
      'internal_webhook_secret',
      'Authenticates internal DB-trigger → edge-function webhook calls'
    );
    RAISE NOTICE 'Created new internal_webhook_secret in Vault. Copy its value to the INTERNAL_WEBHOOK_SECRET edge function secret.';
  END IF;
END $$;

-- Restore notify_new_message: insert notification row AND call edge function.
CREATE OR REPLACE FUNCTION public.notify_new_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  sender_name TEXT;
  supabase_url TEXT := 'https://qclefndzismozdogsfot.supabase.co';
  internal_secret TEXT;
BEGIN
  IF NEW.sender_id = NEW.receiver_id THEN
    RETURN NEW;
  END IF;

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
    internal_secret := public.get_internal_webhook_secret();
  EXCEPTION WHEN OTHERS THEN
    internal_secret := NULL;
  END;

  BEGIN
    PERFORM extensions.http_post(
      url     := supabase_url || '/functions/v1/send-notification-email',
      body    := jsonb_build_object(
                   'type',              'message',
                   'recipient_user_id', NEW.receiver_id,
                   'sender_name',       COALESCE(sender_name, 'Someone'),
                   'sender_user_id',    NEW.sender_id
                 )::text,
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

-- Restore notify_on_like: insert notification rows AND call edge function.
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
  supabase_url     text := 'https://qclefndzismozdogsfot.supabase.co';
  internal_secret  text;
BEGIN
  BEGIN
    internal_secret := public.get_internal_webhook_secret();
  EXCEPTION WHEN OTHERS THEN
    internal_secret := NULL;
  END;

  SELECT name INTO liker_name FROM public.profiles WHERE user_id = NEW.user_id;

  -- Notification row for the person who was liked.
  INSERT INTO public.notifications (user_id, type, title, message, related_user_id)
  VALUES (
    NEW.liked_user_id,
    'like',
    'New Like!',
    COALESCE(liker_name, 'Someone') || ' liked your profile',
    NEW.user_id
  );

  -- Email to the person who was liked.
  BEGIN
    PERFORM extensions.http_post(
      url     := supabase_url || '/functions/v1/send-notification-email',
      body    := jsonb_build_object(
                   'type',              'like',
                   'recipient_user_id', NEW.liked_user_id,
                   'sender_name',       COALESCE(liker_name, 'Someone'),
                   'sender_user_id',    NEW.user_id
                 )::text,
      headers := jsonb_build_object(
                   'Content-Type',     'application/json',
                   'x-internal-secret', COALESCE(internal_secret, '')
                 )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_on_like: failed to send like email: %', SQLERRM;
  END;

  -- Check for mutual like (match).
  SELECT EXISTS (
    SELECT 1 FROM public.likes
    WHERE user_id = NEW.liked_user_id AND liked_user_id = NEW.user_id
  ) INTO is_mutual;

  IF is_mutual THEN
    SELECT name INTO liked_user_name FROM public.profiles WHERE user_id = NEW.liked_user_id;

    INSERT INTO public.notifications (user_id, type, title, message, related_user_id)
    VALUES
      (NEW.user_id,        'match', 'New Match! 🎉',
       'You matched with ' || COALESCE(liked_user_name, 'someone') || '! Start a conversation.',
       NEW.liked_user_id),
      (NEW.liked_user_id,  'match', 'New Match! 🎉',
       'You matched with ' || COALESCE(liker_name, 'someone') || '! Start a conversation.',
       NEW.user_id);

    -- Match email to the person who just liked.
    BEGIN
      PERFORM extensions.http_post(
        url     := supabase_url || '/functions/v1/send-notification-email',
        body    := jsonb_build_object(
                     'type',              'match',
                     'recipient_user_id', NEW.user_id,
                     'sender_name',       COALESCE(liked_user_name, 'Someone'),
                     'sender_user_id',    NEW.liked_user_id
                   )::text,
        headers := jsonb_build_object(
                     'Content-Type',     'application/json',
                     'x-internal-secret', COALESCE(internal_secret, '')
                   )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_on_like: failed to send match email to liker: %', SQLERRM;
    END;

    -- Match email to the person who was liked.
    BEGIN
      PERFORM extensions.http_post(
        url     := supabase_url || '/functions/v1/send-notification-email',
        body    := jsonb_build_object(
                     'type',              'match',
                     'recipient_user_id', NEW.liked_user_id,
                     'sender_name',       COALESCE(liker_name, 'Someone'),
                     'sender_user_id',    NEW.user_id
                   )::text,
        headers := jsonb_build_object(
                     'Content-Type',     'application/json',
                     'x-internal-secret', COALESCE(internal_secret, '')
                   )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_on_like: failed to send match email to liked user: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;
