-- Primeiro, criar uma tabela temporária com apenas os roles únicos (mantendo admin quando houver)
CREATE TEMP TABLE temp_user_roles AS
SELECT DISTINCT ON (user_id) 
  id, user_id, role
FROM public.user_roles
ORDER BY user_id, 
  CASE 
    WHEN role = 'admin' THEN 1
    WHEN role = 'moderator' THEN 2
    WHEN role = 'user' THEN 3
  END;

-- Deletar todos os registros
DELETE FROM public.user_roles;

-- Reinserir apenas os únicos
INSERT INTO public.user_roles (id, user_id, role)
SELECT id, user_id, role FROM temp_user_roles;

-- Agora adicionar a constraint única
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);