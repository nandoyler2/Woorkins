-- Create idempotent bucket creation function
CREATE OR REPLACE FUNCTION public.ensure_bucket(
  p_id TEXT,
  p_name TEXT,
  p_public BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES (p_id, p_name, p_public)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Create all standard buckets idempotently
SELECT public.ensure_bucket('avatars', 'avatars', true);
SELECT public.ensure_bucket('profile-photos', 'profile-photos', true);
SELECT public.ensure_bucket('user-covers', 'user-covers', true);
SELECT public.ensure_bucket('user-media', 'user-media', false);
SELECT public.ensure_bucket('business-logos', 'business-logos', true);
SELECT public.ensure_bucket('business-covers', 'business-covers', true);
SELECT public.ensure_bucket('business-media', 'business-media', false);
SELECT public.ensure_bucket('portfolio', 'portfolio', true);
SELECT public.ensure_bucket('message-attachments', 'message-attachments', false);
SELECT public.ensure_bucket('identity-documents', 'identity-documents', false);
SELECT public.ensure_bucket('support-attachments', 'support-attachments', false);
SELECT public.ensure_bucket('efi-certificates', 'efi-certificates', false);
SELECT public.ensure_bucket('stories', 'stories', true);

-- Create essential RLS policies for support-attachments (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can upload support attachments'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can upload support attachments" ON storage.objects 
      FOR INSERT TO authenticated 
      WITH CHECK (bucket_id = ''support-attachments'' AND auth.uid()::text = (storage.foldername(name))[1])';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can view their own support attachments'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own support attachments" ON storage.objects 
      FOR SELECT TO authenticated 
      USING (bucket_id = ''support-attachments'' AND auth.uid()::text = (storage.foldername(name))[1])';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Admins can view all support attachments'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view all support attachments" ON storage.objects 
      FOR SELECT TO authenticated 
      USING (
        bucket_id = ''support-attachments'' 
        AND EXISTS (
          SELECT 1 FROM public.user_roles 
          WHERE user_id = auth.uid() AND role = ''admin''
        )
      )';
  END IF;
END $$;