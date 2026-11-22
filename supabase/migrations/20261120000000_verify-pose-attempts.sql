-- Per-user limit on AI photo-verification calls (verify-pose).
-- Each AI check costs money, so the edge function records every attempt here
-- and refuses once a member has made too many in the last 24 hours.
-- Only the edge function (service role) reads or writes this table.

CREATE TABLE IF NOT EXISTS public.verify_pose_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verify_pose_attempts_user_time_idx
  ON public.verify_pose_attempts (user_id, created_at DESC);

-- RLS on with no policies: members cannot see or change it; the service role bypasses RLS.
ALTER TABLE public.verify_pose_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.verify_pose_attempts FROM anon, authenticated;
