-- Tabela para verificações manuais de documentos
CREATE TABLE IF NOT EXISTS public.manual_document_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_front_url TEXT NOT NULL,
  document_back_url TEXT NOT NULL,
  selfie_url TEXT NOT NULL,
  social_media_link TEXT,
  whatsapp_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manual_document_submissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own manual submissions"
  ON public.manual_document_submissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = manual_document_submissions.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own manual submissions"
  ON public.manual_document_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = manual_document_submissions.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all manual submissions"
  ON public.manual_document_submissions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update manual submissions"
  ON public.manual_document_submissions
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_manual_document_submissions_updated_at
  BEFORE UPDATE ON public.manual_document_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();