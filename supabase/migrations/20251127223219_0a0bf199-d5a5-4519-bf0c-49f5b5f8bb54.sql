-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Create a more robust version of the welcome email function that doesn't block profile creation
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url text;
BEGIN
  -- Get the Supabase URL
  supabase_url := current_setting('app.settings.supabase_url', true);
  IF supabase_url IS NULL THEN
    supabase_url := 'https://nyhlwamvqjmaxpmqxzah.supabase.co';
  END IF;

  -- Try to send welcome email, but don't fail if it doesn't work
  BEGIN
    PERFORM extensions.http_post(
      url := supabase_url || '/functions/v1/send-welcome-email',
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'name', NEW.name
      )::text,
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Failed to send welcome email: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email();