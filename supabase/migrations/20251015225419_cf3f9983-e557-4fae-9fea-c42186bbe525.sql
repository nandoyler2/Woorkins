-- Fix storage RLS for identity-documents by recreating policies safely

-- INSERT
DROP POLICY IF EXISTS "Users can upload their own identity docs" ON storage.objects;
CREATE POLICY "Users can upload their own identity docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
  )
);

-- SELECT
DROP POLICY IF EXISTS "Users can read their own identity docs" ON storage.objects;
CREATE POLICY "Users can read their own identity docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
  )
);

-- UPDATE
DROP POLICY IF EXISTS "Users can update their own identity docs" ON storage.objects;
CREATE POLICY "Users can update their own identity docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'identity-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
  )
);

-- DELETE
DROP POLICY IF EXISTS "Users can delete their own identity docs" ON storage.objects;
CREATE POLICY "Users can delete their own identity docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
  )
);
