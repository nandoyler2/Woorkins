-- Corrigir perfil business com slug inconsistente
UPDATE profiles 
SET slug = 'teste2',
    last_slug_change_at = now()
WHERE id = '64e8266d-c43d-4efd-b64f-3ac91588fb37'
  AND profile_type = 'business'
  AND username = 'teste2'
  AND slug = 'teste';

-- O trigger update_profile_identifier irá automaticamente:
-- 1. Atualizar global_identifiers de 'teste' → 'teste2'
-- 2. Liberar o identificador 'teste' para reutilização