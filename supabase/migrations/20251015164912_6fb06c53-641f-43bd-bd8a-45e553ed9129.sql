-- RLS policies for message attachments upload using profile-based folder paths
-- Allows public read (bucket is already public) and authenticated users to upload/update/delete

-- Public read policy for message attachments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read for message attachments'
  ) THEN
    CREATE POLICY "Public read for message attachments"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'message-attachments');
  END IF;
END $$;

-- Insert policy: authenticated users can upload to a folder named with their profile_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload own message attachments'
  ) THEN
    CREATE POLICY "Users can upload own message attachments"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'message-attachments'
      AND (storage.foldername(name))[1]::uuid = (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Update policy: authenticated users can update objects under their profile folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update own message attachments'
  ) THEN
    CREATE POLICY "Users can update own message attachments"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'message-attachments'
      AND (storage.foldername(name))[1]::uuid = (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      bucket_id = 'message-attachments'
      AND (storage.foldername(name))[1]::uuid = (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Delete policy: authenticated users can delete objects under their profile folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete own message attachments'
  ) THEN
    CREATE POLICY "Users can delete own message attachments"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'message-attachments'
      AND (storage.foldername(name))[1]::uuid = (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;