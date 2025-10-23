-- Ajustar identifiers para restaurar /fernando como business profile

-- 1. Atualizar username do perfil user para fernando-pessoal
UPDATE profiles
SET username = 'fernando-pessoal'
WHERE id = 'acb97278-371c-48f6-b2d2-1fa5634f970c';

-- 2. Atualizar slug do perfil business para fernando
UPDATE profiles
SET slug = 'fernando'
WHERE id = 'b44b604a-5fa9-48d0-a004-1fdad7151d9f';