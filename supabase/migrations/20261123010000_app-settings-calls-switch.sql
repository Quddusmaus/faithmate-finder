-- On/off switches admins can flip without a code change or a Publish.
-- video_calls: when off, the app hides the call buttons and ignores incoming
-- calls everywhere, and the daily-room function refuses to create rooms.
-- video_calls_ios_app: when off, the same happens only inside the iPhone app
-- (Capacitor on iOS); the website and Android are unaffected. Safe to re-run.
-- A missing row or table counts as "on" everywhere, so the app behaves as
-- before until this migration runs.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key        text PRIMARY KEY,
  enabled    boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Anyone can read app settings"
ON public.app_settings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can change app settings" ON public.app_settings;
CREATE POLICY "Admins can change app settings"
ON public.app_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT UPDATE (enabled, updated_at, updated_by) ON public.app_settings TO authenticated;

INSERT INTO public.app_settings (key, enabled) VALUES
  ('video_calls', true),
  ('video_calls_ios_app', true)
ON CONFLICT (key) DO NOTHING;
