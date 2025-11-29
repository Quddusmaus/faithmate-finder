-- Create photo_verifications table for pose-matching verification
CREATE TABLE public.photo_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pose_type TEXT NOT NULL,
  selfie_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ai_confidence DECIMAL(5, 2),
  ai_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (user_id, status)
);

-- Enable RLS
ALTER TABLE public.photo_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verifications
CREATE POLICY "Users can view own verifications"
ON public.photo_verifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own verifications
CREATE POLICY "Users can create own verifications"
ON public.photo_verifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending verifications
CREATE POLICY "Users can update own pending verifications"
ON public.photo_verifications
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view all
CREATE POLICY "Admins can view all verifications"
ON public.photo_verifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update any
CREATE POLICY "Admins can update verifications"
ON public.photo_verifications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));