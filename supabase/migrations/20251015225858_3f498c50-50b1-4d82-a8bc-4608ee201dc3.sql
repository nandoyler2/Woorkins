-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own identity docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own identity docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own identity docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own identity docs" ON storage.objects;

-- Create new policies for identity-documents bucket
CREATE POLICY "Users can upload their own identity docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-documents'
  AND (storage.foldername(name))[1] = (
    SELECT id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can read their own identity docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND (storage.foldername(name))[1] = (
    SELECT id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own identity docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND (storage.foldername(name))[1] = (
    SELECT id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own identity docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND (storage.foldername(name))[1] = (
    SELECT id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);
