-- Create error_logs table for storing all application errors
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_stack TEXT,
  url TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all errors
CREATE POLICY "Admins can view all errors"
ON public.error_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update errors (mark as resolved)
CREATE POLICY "Admins can update errors"
ON public.error_logs
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete errors
CREATE POLICY "Admins can delete errors"
ON public.error_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can insert errors (for logging from frontend)
CREATE POLICY "Anyone can log errors"
ON public.error_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX idx_error_logs_resolved ON public.error_logs(resolved);

-- Enable realtime for error logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.error_logs;