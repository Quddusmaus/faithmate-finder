-- Connect the existing notify_on_like function to the likes table
DROP TRIGGER IF EXISTS on_like_notify ON public.likes;
CREATE TRIGGER on_like_notify
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_like();

-- Create function for new message notifications
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Only notify if the receiver is different from the sender
  IF NEW.sender_id != NEW.receiver_id THEN
    -- Get sender name
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();