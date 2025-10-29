-- Remove ALL existing policies for message-attachments bucket to avoid conflicts
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname LIKE '%message%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    END LOOP;
END $$;

-- Ensure bucket exists with correct settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('message-attachments', 'message-attachments', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Simple INSERT policy: allow authenticated users to upload to their own folder
CREATE POLICY "message_attachments_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND ((storage.foldername(name))[1])::uuid = auth.uid()
);

-- Simple SELECT policy: allow everyone to view (public bucket)
CREATE POLICY "message_attachments_select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'message-attachments');

-- Simple DELETE policy: allow users to delete their own files
CREATE POLICY "message_attachments_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND ((storage.foldername(name))[1])::uuid = auth.uid()
);

-- Simple UPDATE policy: allow users to update their own files
CREATE POLICY "message_attachments_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND ((storage.foldername(name))[1])::uuid = auth.uid()
);