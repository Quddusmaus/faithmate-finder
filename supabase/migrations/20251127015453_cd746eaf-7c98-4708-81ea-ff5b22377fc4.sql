-- Add verified status to profiles tables
ALTER TABLE public.profiles ADD COLUMN verified boolean DEFAULT false NOT NULL;
ALTER TABLE public.demo_profiles ADD COLUMN verified boolean DEFAULT false NOT NULL;

-- Update some demo profiles to be verified for demonstration
UPDATE public.demo_profiles SET verified = true WHERE id IN (
  SELECT id FROM public.demo_profiles LIMIT 3
);