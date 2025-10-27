-- ============================================
-- UNIFICAÇÃO DE CAMPOS ENTRE USER E BUSINESS
-- ============================================

-- 1. Copiar dados de campos business para campos unificados
UPDATE profiles 
SET 
  full_name = COALESCE(company_name, full_name),
  bio = COALESCE(description, bio),
  location = COALESCE(address, location),
  website = COALESCE(website_url, website),
  avatar_url = COALESCE(logo_url, avatar_url)
WHERE profile_type = 'business' AND company_name IS NOT NULL;

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_profile_type ON profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);

-- 3. Comentário para documentar a mudança
COMMENT ON COLUMN profiles.full_name IS 'Nome completo (pessoa) ou Razão Social (empresa)';
COMMENT ON COLUMN profiles.bio IS 'Biografia (pessoa) ou Descrição (empresa)';
COMMENT ON COLUMN profiles.location IS 'Localização (pessoa) ou Endereço (empresa)';
COMMENT ON COLUMN profiles.website IS 'Website pessoal ou empresarial';
COMMENT ON COLUMN profiles.avatar_url IS 'Foto de perfil (pessoa) ou Logo (empresa)';