-- Add birth_date and document verification fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS document_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS document_verification_status text DEFAULT 'pending';

-- Create document_verifications table
CREATE TABLE IF NOT EXISTS public.document_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_front_url text NOT NULL,
  document_back_url text NOT NULL,
  selfie_url text NOT NULL,
  extracted_name text,
  extracted_cpf text,
  extracted_birth_date date,
  verification_status text NOT NULL DEFAULT 'pending',
  verification_result jsonb,
  ai_analysis jsonb,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(profile_id)
);

-- Enable RLS
ALTER TABLE public.document_verifications ENABLE ROW LEVEL SECURITY;

-- Users can insert their own verification
CREATE POLICY "Users can insert their own verification"
ON public.document_verifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = document_verifications.profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Users can view their own verification
CREATE POLICY "Users can view their own verification"
ON public.document_verifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = document_verifications.profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Admins can view all verifications
CREATE POLICY "Admins can view all verifications"
ON public.document_verifications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update verifications
CREATE POLICY "Admins can update verifications"
ON public.document_verifications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for documents (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'identity-documents',
  'identity-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS for identity-documents bucket
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all identity documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger to update updated_at
CREATE TRIGGER update_document_verifications_updated_at
BEFORE UPDATE ON public.document_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();