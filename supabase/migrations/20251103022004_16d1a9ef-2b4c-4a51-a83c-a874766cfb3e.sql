-- Libera identificadores que pertencem a perfis excluídos (ou órfãos)
CREATE OR REPLACE FUNCTION public.free_identifier_if_owner_deleted(p_identifier TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remover identificadores cujo dono está marcado como deletado
  DELETE FROM public.global_identifiers gi
  USING public.profiles p
  WHERE gi.owner_id = p.id
    AND LOWER(gi.identifier) = LOWER(p_identifier)
    AND COALESCE(p.deleted, false) = true;

  -- Remover identificadores órfãos (sem perfil associado)
  DELETE FROM public.global_identifiers gi
  WHERE LOWER(gi.identifier) = LOWER(p_identifier)
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p2 WHERE p2.id = gi.owner_id
    );
END;
$$;