-- Add social media and negotiation fields to business_profiles
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS facebook text,
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS linkedin text,
ADD COLUMN IF NOT EXISTS twitter text,
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS enable_negotiation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS working_hours text,
ADD COLUMN IF NOT EXISTS services_offered text[];

-- Create a table for business posts
CREATE TABLE IF NOT EXISTS public.business_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  media_urls text[],
  media_types text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on business_posts
ALTER TABLE public.business_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_posts
CREATE POLICY "Business posts are viewable by everyone"
  ON public.business_posts FOR SELECT
  USING (true);

CREATE POLICY "Business owners can create posts"
  ON public.business_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their posts"
  ON public.business_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete their posts"
  ON public.business_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_id AND p.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_business_posts_updated_at
  BEFORE UPDATE ON public.business_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for business media
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-media', 'business-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for business media
CREATE POLICY "Business media is publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-media');

CREATE POLICY "Authenticated users can upload business media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'business-media' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own business media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'business-media' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own business media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'business-media' AND
    auth.role() = 'authenticated'
  );