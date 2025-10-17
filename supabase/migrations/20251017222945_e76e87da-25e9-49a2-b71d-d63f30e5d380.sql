-- Create business_profile_views table to track profile visits
CREATE TABLE IF NOT EXISTS public.business_profile_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  viewer_profile_id UUID,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_business_profile_views_business_id 
  ON public.business_profile_views(business_id);

CREATE INDEX IF NOT EXISTS idx_business_profile_views_viewed_at 
  ON public.business_profile_views(viewed_at DESC);

-- Enable RLS
ALTER TABLE public.business_profile_views ENABLE ROW LEVEL SECURITY;

-- Business owners can view their profile views
CREATE POLICY "Business owners can view their profile views"
ON public.business_profile_views
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM business_profiles bp
    JOIN profiles p ON p.id = bp.profile_id
    WHERE bp.id = business_profile_views.business_id
    AND p.user_id = auth.uid()
  )
);

-- Anyone can insert views (public access)
CREATE POLICY "Anyone can insert profile views"
ON public.business_profile_views
FOR INSERT
WITH CHECK (true);