-- Add description column to business_profiles
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS description TEXT;