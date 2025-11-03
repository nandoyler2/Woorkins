-- Atualizar função para liberar identificadores de perfis excluídos
-- Um identificador está disponível se:
-- 1. Não existe em global_identifiers, OU
-- 2. Existe mas o perfil associado está marcado como deleted = true

CREATE OR REPLACE FUNCTION public.check_identifier_available(p_identifier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM public.global_identifiers gi
    INNER JOIN public.profiles p ON p.id = gi.owner_id
    WHERE LOWER(gi.identifier) = LOWER(p_identifier)
      AND (p.deleted IS NULL OR p.deleted = false)
  );
END;
$$;