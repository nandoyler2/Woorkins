-- 1. Remover entrada antiga do global_identifiers
DELETE FROM global_identifiers 
WHERE identifier = 'fernando' 
  AND identifier_type = 'username';

-- 2. Limpar CPF do business
UPDATE profiles 
SET cpf = NULL
WHERE id = 'b44b604a-5fa9-48d0-a004-1fdad7151d9f';

-- 3. Criar perfil user (trigger vai registrar no global_identifiers automaticamente)
INSERT INTO profiles (user_id, username, profile_type, full_name, cpf)
VALUES (
  '0124c82e-3b02-4996-b017-caae13eac0f3',
  'fernando',
  'user',
  'Fernando de Almeida',
  '37707015851'
);

-- 4. Limpar username do business
UPDATE profiles 
SET username = NULL
WHERE id = 'b44b604a-5fa9-48d0-a004-1fdad7151d9f';