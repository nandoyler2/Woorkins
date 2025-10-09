-- Create reports table for flagging inappropriate content
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('project', 'post', 'evaluation', 'profile', 'business')),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can create reports
CREATE POLICY "Authenticated users can create reports"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.id = reports.reporter_id
  )
);

-- Policy: Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.reports
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Policy: Admins can update reports
CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_content ON public.reports(content_type, content_id);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);