-- Create comped_users table for free access bypass
CREATE TABLE public.comped_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  reason TEXT,
  granted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.comped_users ENABLE ROW LEVEL SECURITY;

-- Users can check if they themselves are comped
CREATE POLICY "Users can view their own comp status"
ON public.comped_users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all comps"
ON public.comped_users
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can grant comps
CREATE POLICY "Admins can insert comps"
ON public.comped_users
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can revoke comps
CREATE POLICY "Admins can delete comps"
ON public.comped_users
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Helper function to check comp status (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.is_comped(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.comped_users WHERE user_id = _user_id
  )
$$;

-- Grant Gretel free access
INSERT INTO public.comped_users (user_id, reason)
VALUES ('b695802d-cae9-4352-b828-6db776ed4681', 'Helping test the app');
