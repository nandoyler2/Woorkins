-- Adicionar campo para rastrear última alteração de username
ALTER TABLE public.profiles
ADD COLUMN last_username_change timestamp with time zone DEFAULT now();

-- Criar índice para performance
CREATE INDEX idx_profiles_last_username_change ON public.profiles(last_username_change);

COMMENT ON COLUMN public.profiles.last_username_change IS 'Data da última alteração do username do usuário';