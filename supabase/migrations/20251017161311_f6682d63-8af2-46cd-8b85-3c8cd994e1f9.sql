-- Adicionar coluna para ativar/desativar perfil profissional
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Criar índice para melhorar performance em consultas de perfis ativos
CREATE INDEX IF NOT EXISTS idx_business_profiles_active 
ON public.business_profiles(active);