-- Adicionar campos de configuração do Linktree na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS linktree_config JSONB DEFAULT '{"layout": "minimal"}'::jsonb,
ADD COLUMN IF NOT EXISTS linktree_social_links JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS linktree_logo_url TEXT,
ADD COLUMN IF NOT EXISTS linktree_slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS last_slug_change_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.linktree_config IS 'Configurações visuais do Linktree (layout, cores, bio)';
COMMENT ON COLUMN public.profiles.linktree_social_links IS 'Links de redes sociais para o Linktree';
COMMENT ON COLUMN public.profiles.linktree_logo_url IS 'Logo personalizada para o Linktree';
COMMENT ON COLUMN public.profiles.linktree_slug IS 'Slug único para a página pública do Linktree';
COMMENT ON COLUMN public.profiles.last_slug_change_at IS 'Data da última alteração do slug do Linktree';