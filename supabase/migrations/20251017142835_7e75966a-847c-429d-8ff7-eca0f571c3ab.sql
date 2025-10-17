-- Create support-attachments bucket for AI assistant file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', true);

-- Policy: Users can upload their own support attachments
CREATE POLICY "Users can upload support attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own support attachments
CREATE POLICY "Users can view their own support attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Admins can view all support attachments
CREATE POLICY "Admins can view all support attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Users can delete their own support attachments
CREATE POLICY "Users can delete their own support attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);