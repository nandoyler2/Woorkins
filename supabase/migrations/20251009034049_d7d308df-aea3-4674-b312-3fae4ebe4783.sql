-- Inserir role de admin para o usuário fernando@stationbrasil.com
-- Você deve primeiro fazer o cadastro com esse email na aplicação
-- Depois essa migração atribuirá automaticamente a role de admin

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role
FROM public.profiles
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'fernando@stationbrasil.com'
)
ON CONFLICT (user_id, role) DO NOTHING;