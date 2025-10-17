-- Create business_admins table
CREATE TABLE IF NOT EXISTS public.business_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permissions jsonb NOT NULL DEFAULT '{
    "edit_profile": false,
    "manage_posts": false,
    "manage_appointments": false,
    "manage_products": false,
    "view_finances": false,
    "manage_team": false
  }'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by_profile_id uuid REFERENCES public.profiles(id),
  UNIQUE(business_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.business_admins ENABLE ROW LEVEL SECURITY;

-- Policy: Business owners can manage admins
CREATE POLICY "Business owners can manage admins"
ON public.business_admins
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.business_profiles bp
    JOIN public.profiles p ON p.id = bp.profile_id
    WHERE bp.id = business_admins.business_id
    AND p.user_id = auth.uid()
  )
);

-- Policy: Admins can view their own admin status
CREATE POLICY "Admins can view their own status"
ON public.business_admins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = business_admins.profile_id
    AND p.user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_business_admins_business_id ON public.business_admins(business_id);
CREATE INDEX IF NOT EXISTS idx_business_admins_profile_id ON public.business_admins(profile_id);