-- Criar função para usuário deletar sua própria conta
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Deletar o perfil (isso vai fazer cascade para outros dados relacionados)
  DELETE FROM public.profiles
  WHERE user_id = auth.uid();

  -- Deletar o usuário da auth
  DELETE FROM auth.users
  WHERE id = auth.uid();
END;
$$;