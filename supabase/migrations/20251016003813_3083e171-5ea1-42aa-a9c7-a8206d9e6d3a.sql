-- Criar função para impedir que admins alterem seu próprio role
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile_id UUID;
  target_profile_id UUID;
BEGIN
  -- Obter o profile_id do usuário atual
  SELECT id INTO current_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- Obter o profile_id do usuário alvo
  SELECT id INTO target_profile_id
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Se o usuário está tentando alterar seu próprio role e é admin, bloquear
  IF current_profile_id = target_profile_id AND 
     (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin' THEN
    RAISE EXCEPTION 'Admins não podem alterar seu próprio role';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para impedir auto-alteração de role
DROP TRIGGER IF EXISTS trigger_prevent_self_role_change ON public.user_roles;
CREATE TRIGGER trigger_prevent_self_role_change
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_change();