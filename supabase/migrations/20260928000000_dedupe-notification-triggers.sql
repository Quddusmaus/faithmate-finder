-- Stop duplicate notifications (and duplicate notification emails).
--
-- Live data showed one message producing up to 16 "X sent you a message"
-- rows, and matches/likes producing 3–4 rows each. Causes:
--
--   1. public.likes carries TWO triggers that both run notify_on_like():
--      `on_new_like` (20251127194335) and `on_like_notify` (20251128173403,
--      which only dropped a trigger by its own name). Every like therefore
--      wrote two like rows, and every match four match rows (two per user),
--      and sent every like/match email twice.
--   2. Triggers and Database Webhooks have also been added from the dashboard
--      and Lovable without a migration (20260513193638 refers to a
--      "Migration 20260514" and a likes webhook that are not in this repo),
--      so the live trigger set cannot be read from supabase/migrations/.
--   3. Nothing made the inserts idempotent, so any extra trigger — including
--      one that also fires on UPDATE, which ChatWindow's mark-as-read does to
--      every message — multiplied the notification.
--
-- This migration:
--   a. Drops EVERY trigger on likes / messages / super_likes that runs one of
--      the notify_* functions, or is a Database Webhook posting to
--      send-notification-email, whatever it is named, then recreates exactly
--      one AFTER INSERT trigger per table.
--   b. Adds notifications.event_key with a unique index on (user_id,
--      event_key). The trigger functions insert with ON CONFLICT DO NOTHING
--      and only send the email when the row was actually inserted, so a
--      re-fire for the same event is a no-op. Keys:
--        message:<message id>     one per message
--        like:<liker id>          one per liker, also across unlike/re-like
--        match:<other user id>    one per matched pair, per recipient
--        super_like:<liker id>    one per liker
--   c. Adds a BEFORE INSERT guard on notifications for rows WITHOUT an
--      event_key (i.e. from any writer not updated here): an identical unread
--      notification written in the last 10 seconds is dropped.
--
-- Existing duplicate rows are left in place.
--
-- NOTE: the edge-function URL is hardcoded below. It now points at
-- nyhlwamvqjmaxpmqxzah, the project unityhearts.app actually uses (per .env,
-- the vite.config.ts fallback and the deployed bundle). 20260508000000,
-- 20260513000000 and 20260513193638 pointed these functions at
-- qclefndzismozdogsfot, so message/like/match emails went to the wrong
-- project. If the project ref changes, these functions must be rewritten.

-- ---------------------------------------------------------------------------
-- a. Remove every notification trigger, however it was created
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT t.tgname, c.relname
    FROM pg_trigger t
    JOIN pg_class c      ON c.oid = t.tgrelid
    JOIN pg_namespace n  ON n.oid = c.relnamespace
    JOIN pg_proc p       ON p.oid = t.tgfoid
    JOIN pg_namespace pn ON pn.oid = p.pronamespace
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND c.relname IN ('likes', 'messages', 'super_likes')
      AND (
        (pn.nspname = 'public'
          AND p.proname IN ('notify_on_like', 'notify_new_message', 'notify_on_super_like'))
        OR (pn.nspname = 'supabase_functions'
          AND p.proname = 'http_request'
          AND pg_get_triggerdef(t.oid) LIKE '%send-notification-email%')
      )
  LOOP
    RAISE NOTICE 'Dropping notification trigger % on public.%', r.tgname, r.relname;
    EXECUTE format('DROP TRIGGER %I ON public.%I', r.tgname, r.relname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- b. Idempotency key
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS event_key text;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_event_key_uniq
  ON public.notifications (user_id, event_key)
  WHERE event_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- c. Guard against writers that don't set event_key
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.skip_duplicate_notification()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.event_key IS NULL AND EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = NEW.user_id
      AND type = NEW.type
      AND related_user_id IS NOT DISTINCT FROM NEW.related_user_id
      AND message IS NOT DISTINCT FROM NEW.message
      AND read = false
      AND created_at > now() - interval '10 seconds'
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS skip_duplicate_notification ON public.notifications;
CREATE TRIGGER skip_duplicate_notification
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.skip_duplicate_notification();

-- ---------------------------------------------------------------------------
-- Trigger functions: same behaviour as 20260513193638, made idempotent
-- ---------------------------------------------------------------------------
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
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_super_like()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  liker_name text;
BEGIN
  SELECT name INTO liker_name FROM public.profiles WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, related_user_id, event_key)
  VALUES (
    NEW.super_liked_user_id,
    'super_like',
    '⭐ Super Like!',
    COALESCE(liker_name, 'Someone') || ' sent you a Super Like!',
    NEW.user_id,
    'super_like:' || NEW.user_id
  )
  ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;

  -- A super like is also a regular like (fires notify_on_like once).
  INSERT INTO public.likes (user_id, liked_user_id)
  VALUES (NEW.user_id, NEW.super_liked_user_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Exactly one trigger per table
-- ---------------------------------------------------------------------------
CREATE TRIGGER on_like_notify
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_like();

CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

CREATE TRIGGER on_super_like_created
  AFTER INSERT ON public.super_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_super_like();
