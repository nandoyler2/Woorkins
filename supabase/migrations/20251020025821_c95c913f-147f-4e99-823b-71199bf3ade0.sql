-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload business media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own business media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own business media" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to business media" ON storage.objects;

-- Recreate policies with correct permissions
CREATE POLICY "Authenticated users can upload business media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-media');

CREATE POLICY "Users can update their own business media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'business-media');

CREATE POLICY "Users can delete their own business media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'business-media');

CREATE POLICY "Public read access to business media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'business-media');