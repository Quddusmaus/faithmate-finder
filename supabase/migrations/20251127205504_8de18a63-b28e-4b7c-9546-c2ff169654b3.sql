-- Add interests column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN interests text[] DEFAULT '{}';

-- Add interests column to demo_profiles table
ALTER TABLE public.demo_profiles 
ADD COLUMN interests text[] DEFAULT '{}';

-- Update demo profiles with sample interests
UPDATE public.demo_profiles SET interests = ARRAY['Devotionals', 'Ruhi Books', 'Children''s Classes'] WHERE name = 'Sarah';
UPDATE public.demo_profiles SET interests = ARRAY['Junior Youth Animator', 'Travel Teaching'] WHERE name = 'Michael';
UPDATE public.demo_profiles SET interests = ARRAY['Pioneering', 'Devotionals', 'Ruhi Books'] WHERE name = 'Emma';
UPDATE public.demo_profiles SET interests = ARRAY['Children''s Classes', 'Junior Youth Animator', 'Devotionals'] WHERE name = 'James';
UPDATE public.demo_profiles SET interests = ARRAY['Travel Teaching', 'Pioneering', 'Ruhi Books'] WHERE name = 'Olivia';