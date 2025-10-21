-- Create user-covers storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-covers', 'user-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects for user-covers
CREATE POLICY "User covers are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-covers');

CREATE POLICY "Users can upload their own cover"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own cover"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'user-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own cover"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'user-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);