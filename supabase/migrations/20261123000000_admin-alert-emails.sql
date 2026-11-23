-- Email admins when a profile report, ban appeal or contact-form message
-- arrives. Before this, those rows were only listed in /admin and nobody was
-- told (a report sat unseen for six months).
--
-- The trigger calls the notify-admins edge function with pg_net, the same way
-- notify_on_like does (see 20261122020000). Only the kind and a short summary
-- are sent: the report reason code or the contact subject; nothing for appeals.
-- To avoid an email flood (the contact form is open to anyone), no email is
-- sent if another item of the same kind arrived in the previous 10 minutes;
-- the email points at the admin page, which lists everything waiting.
-- Errors are caught, so a failed alert never blocks the insert.

CREATE OR REPLACE FUNCTION public.notify_admins_new_item()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url TEXT := 'https://nyhlwamvqjmaxpmqxzah.supabase.co';
  internal_secret TEXT;
  alert_kind TEXT;
  alert_detail TEXT;
  recent BOOLEAN;
BEGIN
  IF TG_TABLE_NAME = 'profile_reports' THEN
    alert_kind := 'report';
    alert_detail := NEW.reason;
    SELECT EXISTS (SELECT 1 FROM public.profile_reports
                   WHERE id <> NEW.id AND created_at > now() - interval '10 minutes') INTO recent;
  ELSIF TG_TABLE_NAME = 'ban_appeals' THEN
    alert_kind := 'appeal';
    alert_detail := NULL;
    SELECT EXISTS (SELECT 1 FROM public.ban_appeals
                   WHERE id <> NEW.id AND submitted_at > now() - interval '10 minutes') INTO recent;
  ELSIF TG_TABLE_NAME = 'contact_submissions' THEN
    alert_kind := 'contact';
    alert_detail := left(NEW.subject, 200);
    SELECT EXISTS (SELECT 1 FROM public.contact_submissions
                   WHERE id <> NEW.id AND created_at > now() - interval '10 minutes') INTO recent;
  ELSE
    RETURN NEW;
  END IF;

  IF recent THEN
    RETURN NEW;
  END IF;

  BEGIN
    internal_secret := public.get_internal_webhook_secret();
  EXCEPTION WHEN OTHERS THEN
    internal_secret := NULL;
  END;

  BEGIN
    PERFORM net.http_post(
      url     := supabase_url || '/functions/v1/notify-admins',
      body    := jsonb_build_object('kind', alert_kind, 'detail', alert_detail),
      headers := jsonb_build_object(
                   'Content-Type',      'application/json',
                   'x-internal-secret', COALESCE(internal_secret, '')
                 )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admins_new_item: failed to call notify-admins: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notify_admins_on_report ON public.profile_reports;
CREATE TRIGGER notify_admins_on_report
  AFTER INSERT ON public.profile_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_item();

DROP TRIGGER IF EXISTS notify_admins_on_appeal ON public.ban_appeals;
CREATE TRIGGER notify_admins_on_appeal
  AFTER INSERT ON public.ban_appeals
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_item();

DROP TRIGGER IF EXISTS notify_admins_on_contact ON public.contact_submissions;
CREATE TRIGGER notify_admins_on_contact
  AFTER INSERT ON public.contact_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_item();

-- Only triggers call it.
REVOKE ALL ON FUNCTION public.notify_admins_new_item() FROM PUBLIC, anon, authenticated;
