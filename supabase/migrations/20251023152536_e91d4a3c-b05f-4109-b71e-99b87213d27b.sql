-- Permitir múltiplos perfis por usuário
-- Remover constraint UNIQUE de user_id
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;

-- Criar índice normal para performance em user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Ajustar username para não ser obrigatório (perfis business não usam)
ALTER TABLE public.profiles ALTER COLUMN username DROP NOT NULL;

-- Remover UNIQUE global de username
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- Criar índice único parcial: username único apenas para perfis de usuário (pessoais)
CREATE UNIQUE INDEX IF NOT EXISTS unique_username_users 
ON public.profiles(username) 
WHERE profile_type = 'user' AND deleted IS FALSE AND username IS NOT NULL;

-- Garantir unicidade de slug para perfis profissionais
CREATE UNIQUE INDEX IF NOT EXISTS unique_business_slug 
ON public.profiles(slug) 
WHERE profile_type = 'business' AND deleted IS FALSE AND slug IS NOT NULL;

-- Comentário explicativo
COMMENT ON INDEX unique_username_users IS 'Username único apenas para perfis pessoais (profile_type = user)';
COMMENT ON INDEX unique_business_slug IS 'Slug único apenas para perfis profissionais (profile_type = business)';