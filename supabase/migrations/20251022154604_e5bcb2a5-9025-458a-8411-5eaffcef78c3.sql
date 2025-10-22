-- Add cover_position column to profiles to store vertical alignment (0-100)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cover_position INTEGER DEFAULT 50;