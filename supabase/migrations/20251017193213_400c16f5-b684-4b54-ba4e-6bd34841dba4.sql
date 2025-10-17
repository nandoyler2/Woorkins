-- Add linktree configuration columns to business_profiles
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS linktree_config JSONB DEFAULT '{"layout": "minimal"}'::jsonb,
ADD COLUMN IF NOT EXISTS linktree_social_links JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS linktree_logo_url TEXT;