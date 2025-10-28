-- Add username_last_changed column to track username changes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_last_changed timestamp with time zone;

COMMENT ON COLUMN profiles.username_last_changed IS 'Timestamp of the last username change. NULL means user has never changed their username (can change for free once).';

-- Create function to generate available username from base
CREATE OR REPLACE FUNCTION generate_available_username(base_text text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  clean_base text;
  candidate text;
  attempt integer := 1;
BEGIN
  -- Clean and slugify the base
  clean_base := lower(base_text);
  clean_base := regexp_replace(clean_base, '[^a-z0-9]', '_', 'g');
  clean_base := regexp_replace(clean_base, '_{2,}', '_', 'g');
  clean_base := regexp_replace(clean_base, '^_|_$', '', 'g');
  clean_base := substring(clean_base, 1, 20);
  
  -- Fallback if empty
  IF clean_base = '' THEN
    clean_base := 'user';
  END IF;
  
  -- Try base first
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE username = clean_base
    UNION
    SELECT 1 FROM profiles WHERE slug = clean_base AND profile_type = 'business'
  ) THEN
    RETURN clean_base;
  END IF;
  
  -- Try with numbers
  WHILE attempt < 100 LOOP
    candidate := clean_base || attempt::text;
    
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE username = candidate
      UNION
      SELECT 1 FROM profiles WHERE slug = candidate AND profile_type = 'business'
    ) THEN
      RETURN candidate;
    END IF;
    
    attempt := attempt + 1;
  END LOOP;
  
  -- Final fallback with timestamp
  RETURN clean_base || '_' || substring(extract(epoch from now())::text, 7);
END;
$$;

-- Populate usernames for profiles that don't have one
UPDATE profiles
SET username = generate_available_username(COALESCE(slug, full_name, 'user'))
WHERE username IS NULL;

-- Drop the temporary function (keep it if you want it available)
-- DROP FUNCTION IF EXISTS generate_available_username(text);