-- Add linktree_slug to business_profiles
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS linktree_slug TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_profiles_linktree_slug ON business_profiles(linktree_slug);