-- Add soft delete columns to business_profiles
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Update RLS policy to hide deleted profiles from public view
DROP POLICY IF EXISTS "Business profiles are viewable by everyone" ON business_profiles;

CREATE POLICY "Business profiles are viewable by everyone"
ON business_profiles
FOR SELECT
USING (deleted = FALSE OR deleted IS NULL);

-- Allow admins to see all profiles including deleted ones
CREATE POLICY "Admins can view all business profiles including deleted"
ON business_profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update any business profile (for restore/move)
CREATE POLICY "Admins can update any business profile"
ON business_profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));