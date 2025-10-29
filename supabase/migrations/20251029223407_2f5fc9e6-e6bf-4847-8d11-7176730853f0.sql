-- Adicionar colunas para thumbnails e versões otimizadas de imagens
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS cover_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS logo_thumbnail_url TEXT;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_thumbnail ON profiles(avatar_thumbnail_url);
CREATE INDEX IF NOT EXISTS idx_profiles_cover_thumbnail ON profiles(cover_thumbnail_url);
CREATE INDEX IF NOT EXISTS idx_profiles_logo_thumbnail ON profiles(logo_thumbnail_url);

-- Comentários para documentação
COMMENT ON COLUMN profiles.avatar_thumbnail_url IS 'URL otimizada do avatar em tamanho reduzido (150x150px) para listagens';
COMMENT ON COLUMN profiles.cover_thumbnail_url IS 'URL otimizada da capa em tamanho reduzido (600x200px) para cards';
COMMENT ON COLUMN profiles.logo_thumbnail_url IS 'URL otimizada do logo em tamanho reduzido para visualizações pequenas';