-- Update notify_new_message function to also send email notifications
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  supabase_url TEXT;
BEGIN
  -- Only notify if the receiver is different from the sender
  IF NEW.sender_id != NEW.receiver_id THEN
    -- Get the Supabase URL
    supabase_url := current_setting('app.settings.supabase_url', true);
    IF supabase_url IS NULL THEN
      supabase_url := 'https://nyhlwamvqjmaxpmqxzah.supabase.co';
    END IF;

    -- Get sender name
    SELECT name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
    
    -- Create in-app notification
    INSERT INTO public.notifications (user_id, type, title, message, related_user_id)
    VALUES (
      NEW.receiver_id,
      'message',
      'New Message',
      COALESCE(sender_name, 'Someone') || ' sent you a message',
      NEW.sender_id
    );

    -- Try to send email notification (don't fail if it doesn't work)
    BEGIN
      PERFORM extensions.http_post(
        url := supabase_url || '/functions/v1/send-notification-email',
        body := jsonb_build_object(
          'type', 'message',
          'recipient_user_id', NEW.receiver_id,
          'sender_name', COALESCE(sender_name, 'Someone'),
          'sender_user_id', NEW.sender_id
        )::text,
        headers := jsonb_build_object('Content-Type', 'application/json')
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send message notification email: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;