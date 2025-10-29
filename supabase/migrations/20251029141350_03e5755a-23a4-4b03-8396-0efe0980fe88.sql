-- Fix RLS for message-attachments: allow folder by auth.uid() OR by owned profile id

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "message_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "message_attachments_delete" ON storage.objects;
DROP POLICY IF EXISTS "message_attachments_update" ON storage.objects;
-- Keep select policy as-is (public access), do not drop

-- Ensure bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('message-attachments', 'message-attachments', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800;

-- Helper expression reused across policies
-- Access is allowed when:
-- 1) bucket is 'message-attachments' AND first folder equals auth.uid()
-- 2) OR first folder equals a profile.id that belongs to auth.uid()

CREATE POLICY "message_attachments_insert" 
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND (
    ((storage.foldername(name))[1])::uuid = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = ((storage.foldername(name))[1])::uuid
        AND p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "message_attachments_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (
    ((storage.foldername(name))[1])::uuid = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = ((storage.foldername(name))[1])::uuid
        AND p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "message_attachments_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (
    ((storage.foldername(name))[1])::uuid = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = ((storage.foldername(name))[1])::uuid
        AND p.user_id = auth.uid()
    )
  )
);
