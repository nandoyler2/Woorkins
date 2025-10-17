-- Adicionar coluna para rastrear última mudança de slug
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS last_slug_change_at timestamp with time zone DEFAULT now();