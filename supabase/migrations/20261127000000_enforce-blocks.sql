-- Enforce blocks in the database, not only in the browser.
--
-- Until now a block was: insert into blocked_users, then the browser deletes
-- the likes between the two members. The profiles policy already hides each
-- from the other (is_blocked works both ways), but everything else relied on
-- that client-side delete:
--
--   * RLS only lets a member delete their OWN likes, so the blocked member's
--     like (and any super like) stayed behind. Their Super Like kept showing
--     in the blocker's "Super Likes" list, and a later like back would have
--     re-created the match.
--   * The delete's error was ignored. If it failed, the two stayed matched,
--     so they could still message and call each other.
--   * The blocked member could still insert likes / super likes through the
--     API, and each one sends the blocker a notification (and email, and push).
--
-- This migration:
--   1. are_users_matched() is false for a blocked pair. It gates the messages
--      INSERT policy, the call_signals INSERT policy and the daily-room edge
--      function, so a block stops messages and calls even if likes remain.
--   2. Inserting a block deletes the likes and super likes between the two
--      members in both directions (SECURITY DEFINER, so the other member's
--      rows go too).
--   3. New likes / super likes between a blocked pair are dropped silently
--      (BEFORE INSERT returns NULL), so no notification fires and the blocked
--      member isn't told they were blocked.
--   4. Cleans up likes / super likes left over from blocks made before this.
--
-- Unblocking (deleting the blocked_users row) restores nothing: both members
-- have to like each other again to match.

-- 1. A blocked pair is never "matched" -------------------------------------
CREATE OR REPLACE FUNCTION public.are_users_matched(p_user1_id uuid, p_user2_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.matches
    WHERE (matches.user1_id = p_user1_id AND matches.user2_id = p_user2_id)
       OR (matches.user1_id = p_user2_id AND matches.user2_id = p_user1_id)
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = p_user1_id AND blocked_id = p_user2_id)
       OR (blocker_id = p_user2_id AND blocked_id = p_user1_id)
  );
END;
$function$;

-- 2. A block removes likes and super likes both ways -----------------------
CREATE OR REPLACE FUNCTION public.remove_likes_on_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.likes
  WHERE (user_id = NEW.blocker_id AND liked_user_id = NEW.blocked_id)
     OR (user_id = NEW.blocked_id AND liked_user_id = NEW.blocker_id);

  DELETE FROM public.super_likes
  WHERE (user_id = NEW.blocker_id AND super_liked_user_id = NEW.blocked_id)
     OR (user_id = NEW.blocked_id AND super_liked_user_id = NEW.blocker_id);

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_block_remove_likes ON public.blocked_users;
CREATE TRIGGER on_block_remove_likes
  AFTER INSERT ON public.blocked_users
  FOR EACH ROW
  EXECUTE FUNCTION public.remove_likes_on_block();

-- 3. No new likes / super likes between a blocked pair ---------------------
CREATE OR REPLACE FUNCTION public.skip_like_if_blocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target uuid;
BEGIN
  IF TG_TABLE_NAME = 'super_likes' THEN
    target := NEW.super_liked_user_id;
  ELSE
    target := NEW.liked_user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = NEW.user_id AND blocked_id = target)
       OR (blocker_id = target AND blocked_id = NEW.user_id)
  ) THEN
    RETURN NULL; -- drop the row; AFTER INSERT notification triggers don't run
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS skip_like_if_blocked ON public.likes;
CREATE TRIGGER skip_like_if_blocked
  BEFORE INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.skip_like_if_blocked();

DROP TRIGGER IF EXISTS skip_like_if_blocked ON public.super_likes;
CREATE TRIGGER skip_like_if_blocked
  BEFORE INSERT ON public.super_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.skip_like_if_blocked();

-- Trigger functions are not meant to be called directly.
REVOKE EXECUTE ON FUNCTION public.remove_likes_on_block() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.skip_like_if_blocked()  FROM anon, authenticated, public;

-- 4. Clean up after blocks made before this migration ----------------------
DELETE FROM public.likes l
USING public.blocked_users b
WHERE (l.user_id = b.blocker_id AND l.liked_user_id = b.blocked_id)
   OR (l.user_id = b.blocked_id AND l.liked_user_id = b.blocker_id);

DELETE FROM public.super_likes s
USING public.blocked_users b
WHERE (s.user_id = b.blocker_id AND s.super_liked_user_id = b.blocked_id)
   OR (s.user_id = b.blocked_id AND s.super_liked_user_id = b.blocker_id);
