-- Cleanup conflicting storage buckets and related objects, plus drop duplicate support-attachments policies if present

-- 1) Remove all objects from listed buckets, then delete the buckets (idempotent)
DO $$
BEGIN
  -- Remove objects first to avoid FK constraints
  DELETE FROM storage.objects 
  WHERE bucket_id IN (
    'avatars',
    'profile-photos',
    'user-covers',
    'user-media',
    'business-logos',
    'business-covers',
    'business-media',
    'portfolio',
    'message-attachments',
    'identity-documents',
    'support-attachments',
    'efi-certificates',
    'stories'
  );
  
  -- Delete the buckets if they exist
  DELETE FROM storage.buckets 
  WHERE id IN (
    'avatars',
    'profile-photos',
    'user-covers',
    'user-media',
    'business-logos',
    'business-covers',
    'business-media',
    'portfolio',
    'message-attachments',
    'identity-documents',
    'support-attachments',
    'efi-certificates',
    'stories'
  );
EXCEPTION WHEN undefined_table THEN
  -- Storage not initialized yet; ignore
  NULL;
END $$;

-- 2) Drop duplicate policies for support-attachments if they exist
DO $$
BEGIN
  -- Users can upload support attachments
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can upload support attachments'
  ) THEN
    DROP POLICY "Users can upload support attachments" ON storage.objects;
  END IF;

  -- Users can view their own support attachments
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can view their own support attachments'
  ) THEN
    DROP POLICY "Users can view their own support attachments" ON storage.objects;
  END IF;

  -- Admins can view all support attachments
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Admins can view all support attachments'
  ) THEN
    DROP POLICY "Admins can view all support attachments" ON storage.objects;
  END IF;

  -- Users can delete their own support attachments
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can delete their own support attachments'
  ) THEN
    DROP POLICY "Users can delete their own support attachments" ON storage.objects;
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;