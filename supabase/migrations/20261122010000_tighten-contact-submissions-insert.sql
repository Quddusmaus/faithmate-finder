-- Security finding (Lovable scan, 2026-11-22): the contact form's insert
-- policy was WITH CHECK (true), so anyone could insert a submission carrying
-- another member's user_id (an admin would see it as coming from them), or
-- pre-set status / responded_at / admin_notes.
--
-- Visitors who aren't signed in can still use the contact form. A submission
-- may only carry the sender's own user_id (or none), must start as
-- 'pending' with the admin-only fields empty, and has length limits that
-- match the form's own validation (with headroom).
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;

CREATE POLICY "Anyone can submit contact form"
ON public.contact_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND status = 'pending'
  AND responded_at IS NULL
  AND admin_notes IS NULL
  AND char_length(name) BETWEEN 1 AND 100
  AND char_length(email) BETWEEN 3 AND 255
  AND char_length(subject) BETWEEN 1 AND 200
  AND char_length(message) BETWEEN 1 AND 5000
);
