-- Point the welcome-email trigger at the production project.
--
-- 20260508000000 and 20260513000000 (from the abandoned move to project
-- qclefndzismozdogsfot, paused since May 2026) set send_welcome_email() to call
-- that project. 20260928000000 re-pointed notify_on_like, notify_new_message
-- and notify_on_super_like back at production but not send_welcome_email.
-- Whichever of those migrations a database has applied, after this one every
-- email trigger calls production (nyhlwamvqjmaxpmqxzah), where the
-- send-welcome-email function and RESEND_API_KEY live.
--
-- Same body as 20260513000000 apart from the URL.

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
