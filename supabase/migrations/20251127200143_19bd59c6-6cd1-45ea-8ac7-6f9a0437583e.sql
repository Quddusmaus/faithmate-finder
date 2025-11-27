-- Create function to send welcome email on new profile
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text;
BEGIN
  -- Get the Supabase URL
  supabase_url := current_setting('app.settings.supabase_url', true);
  IF supabase_url IS NULL THEN
    supabase_url := 'https://nyhlwamvqjmaxpmqxzah.supabase.co';
  END IF;

  -- Send welcome email via edge function
  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/send-welcome-email',
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'name', NEW.name
    )::text,
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table for new signups
CREATE TRIGGER on_new_profile_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email();