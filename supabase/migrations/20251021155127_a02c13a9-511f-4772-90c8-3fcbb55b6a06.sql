-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('business-media', 'business-media', true),
  ('user-media', 'user-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public can view business-media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view user-media" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can upload testimonials photos" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update their media" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their testimonials photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their media" ON storage.objects;

-- Allow public read access to these buckets
CREATE POLICY "Public can view business-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-media');

CREATE POLICY "Public can view user-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-media');

-- Business owners can upload/update media under their business_id folder
CREATE POLICY "Business owners can upload testimonials photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'business-media'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT bp.id
      FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'business-media'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT bp.id
      FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'business-media'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT bp.id
      FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Users can upload/update media under their profile_id folder
CREATE POLICY "Users can upload their testimonials photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-media'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT pr.id FROM public.profiles pr WHERE pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-media'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT pr.id FROM public.profiles pr WHERE pr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'user-media'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT pr.id FROM public.profiles pr WHERE pr.user_id = auth.uid()
    )
  );