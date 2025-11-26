-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  age INTEGER,
  location TEXT,
  bio TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  gender TEXT,
  looking_for TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT age_check CHECK (age >= 18 AND age <= 120)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profile access
CREATE POLICY "Profiles are viewable by authenticated users" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Create demo_profiles table for sample data (no auth requirement)
CREATE TABLE public.demo_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER,
  location TEXT,
  bio TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  gender TEXT,
  looking_for TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public read access to demo profiles
ALTER TABLE public.demo_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo profiles are viewable by everyone" 
ON public.demo_profiles 
FOR SELECT 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample demo profiles
INSERT INTO public.demo_profiles (name, age, location, bio, gender, looking_for, photo_urls) VALUES
  ('Sarah Johnson', 28, 'New York, NY', 'Teacher passionate about education and service. Love hiking, reading, and meaningful conversations about faith and unity.', 'Female', 'Male', ARRAY['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400']),
  ('Michael Chen', 32, 'San Francisco, CA', 'Software engineer who values kindness and spiritual growth. Enjoy music, cooking, and exploring the intersection of faith and technology.', 'Male', 'Female', ARRAY['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400']),
  ('Priya Patel', 26, 'Chicago, IL', 'Medical student dedicated to service and healing. Love yoga, art, and building community through shared values.', 'Female', 'Male', ARRAY['https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400']),
  ('David Martinez', 30, 'Austin, TX', 'Architect passionate about creating beautiful spaces. Seeking someone who values unity, equality, and building a better world together.', 'Male', 'Female', ARRAY['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400']),
  ('Leila Hassan', 29, 'Seattle, WA', 'Environmental scientist and nature lover. Deeply connected to Bahai principles of unity and peace. Love outdoor adventures and deep conversations.', 'Female', 'Male', ARRAY['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400']),
  ('James Wilson', 34, 'Boston, MA', 'Writer and educator exploring themes of spirituality and social justice. Seeking a partner who shares a commitment to service and growth.', 'Male', 'Female', ARRAY['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400']);