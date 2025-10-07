-- Add missing columns to business_profiles
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Create index for slug lookup
CREATE INDEX IF NOT EXISTS idx_business_profiles_slug ON public.business_profiles(slug);

-- Update existing records to have slugs if they don't
UPDATE public.business_profiles
SET slug = LOWER(REGEXP_REPLACE(company_name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;