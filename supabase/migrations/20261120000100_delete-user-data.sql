-- Complete, all-or-nothing deletion of one member's data.
--
-- Called only by the delete-account edge function (service role), right before
-- it deletes the member's sign-in account. Everything here runs in a single
-- transaction: if any step fails, nothing is deleted and the member sees an error,
-- instead of the old client-side approach that could stop halfway.
--
-- Tables that may not exist in every environment are skipped safely.

CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  step record;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id is required';
  END IF;

  -- Rows that belong to this member: delete them.
  -- Reactions on messages that are about to be deleted go first.
  IF to_regclass('public.message_reactions') IS NOT NULL AND to_regclass('public.messages') IS NOT NULL THEN
    DELETE FROM public.message_reactions
     WHERE user_id = target_user_id
        OR message_id IN (SELECT id FROM public.messages
                           WHERE sender_id = target_user_id OR receiver_id = target_user_id);
  END IF;

  FOR step IN
    SELECT * FROM (VALUES
      ('messages', 'sender_id'), ('messages', 'receiver_id'),
      ('likes', 'user_id'), ('likes', 'liked_user_id'),
      ('super_likes', 'user_id'), ('super_likes', 'super_liked_user_id'),
      ('blocked_users', 'blocker_id'), ('blocked_users', 'blocked_id'),
      ('call_signals', 'caller_id'), ('call_signals', 'receiver_id'),
      ('notifications', 'user_id'), ('notifications', 'related_user_id'),
      ('notification_preferences', 'user_id'),
      ('photo_verifications', 'user_id'),
      ('verification_requests', 'user_id'),
      ('verify_pose_attempts', 'user_id'),
      ('ban_appeals', 'user_id'),
      ('profile_reports', 'reporter_id'),
      ('contact_submissions', 'user_id'),
      ('daily_like_usage', 'user_id'),
      ('daily_call_usage', 'user_id'),
      ('daily_super_like_usage', 'user_id'),
      ('subscriptions', 'user_id'),
      ('comped_users', 'user_id'),
      ('user_roles', 'user_id'),
      -- Last: reports about this member cascade from their profile.
      ('profiles', 'user_id')
    ) AS t(tbl, col)
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = step.tbl AND column_name = step.col) THEN
      EXECUTE format('DELETE FROM public.%I WHERE %I = $1', step.tbl, step.col) USING target_user_id;
    END IF;
  END LOOP;

  -- Records other people keep, where this member is only named as the
  -- reviewer/admin or in a log: keep the record, remove the link to them.
  FOR step IN
    SELECT * FROM (VALUES
      ('verification_requests', 'reviewed_by'),
      ('profile_reports', 'reviewed_by'),
      ('ban_appeals', 'reviewed_by'),
      ('comped_users', 'granted_by'),
      ('error_logs', 'user_id'),
      ('error_logs', 'resolved_by')
    ) AS t(tbl, col)
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = step.tbl AND column_name = step.col
                  AND is_nullable = 'YES') THEN
      EXECUTE format('UPDATE public.%I SET %I = NULL WHERE %I = $1', step.tbl, step.col, step.col) USING target_user_id;
    END IF;
  END LOOP;
END;
$$;

-- Only the edge function (service role) may call this. Members cannot call it directly.
REVOKE ALL ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO service_role;
