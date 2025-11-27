-- Create ban_appeals table
CREATE TABLE public.ban_appeals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  appeal_reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_response text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid
);

-- Enable Row Level Security
ALTER TABLE public.ban_appeals ENABLE ROW LEVEL SECURITY;

-- Users can create their own appeals
CREATE POLICY "Users can create their own appeals"
ON public.ban_appeals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own appeals
CREATE POLICY "Users can view their own appeals"
ON public.ban_appeals
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all appeals
CREATE POLICY "Admins can view all appeals"
ON public.ban_appeals
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update appeals
CREATE POLICY "Admins can update appeals"
ON public.ban_appeals
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));