-- Corrigir funções de trigger para suportar profiles unificados

-- Função para registrar identificador de perfil (user ou business)
CREATE OR REPLACE FUNCTION public.register_profile_identifier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identifier TEXT;
  v_identifier_type TEXT;
BEGIN
  -- Determinar qual identificador usar baseado no profile_type
  IF NEW.profile_type = 'user' THEN
    v_identifier := NEW.username;
    v_identifier_type := 'username';
  ELSIF NEW.profile_type = 'business' THEN
    v_identifier := NEW.slug;
    v_identifier_type := 'business_slug';
  ELSE
    RETURN NEW; -- Se não for user nem business, não fazer nada
  END IF;
  
  -- Se o identificador está vazio, não fazer nada
  IF v_identifier IS NULL OR v_identifier = '' THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se o identificador já existe
  IF NOT public.check_identifier_available(v_identifier) THEN
    RAISE EXCEPTION '% já está em uso', v_identifier;
  END IF;
  
  -- Registrar o identificador
  INSERT INTO public.global_identifiers (identifier, identifier_type, owner_id)
  VALUES (LOWER(v_identifier), v_identifier_type, NEW.id);
  
  RETURN NEW;
END;
$$;

-- Função para atualizar identificador de perfil
CREATE OR REPLACE FUNCTION public.update_profile_identifier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_identifier TEXT;
  v_new_identifier TEXT;
  v_identifier_type TEXT;
BEGIN
  -- Determinar qual identificador usar baseado no profile_type
  IF NEW.profile_type = 'user' THEN
    v_old_identifier := OLD.username;
    v_new_identifier := NEW.username;
    v_identifier_type := 'username';
  ELSIF NEW.profile_type = 'business' THEN
    v_old_identifier := OLD.slug;
    v_new_identifier := NEW.slug;
    v_identifier_type := 'business_slug';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Se o identificador mudou
  IF v_old_identifier != v_new_identifier THEN
    -- Se o novo identificador está vazio, deletar o antigo
    IF v_new_identifier IS NULL OR v_new_identifier = '' THEN
      DELETE FROM public.global_identifiers
      WHERE identifier = LOWER(v_old_identifier)
        AND identifier_type = v_identifier_type
        AND owner_id = NEW.id;
      RETURN NEW;
    END IF;
    
    -- Verificar se o novo identificador está disponível
    IF NOT public.check_identifier_available(v_new_identifier) THEN
      RAISE EXCEPTION '% já está em uso', v_new_identifier;
    END IF;
    
    -- Atualizar o registro
    UPDATE public.global_identifiers
    SET identifier = LOWER(v_new_identifier),
        updated_at = now()
    WHERE identifier = LOWER(v_old_identifier)
      AND identifier_type = v_identifier_type
      AND owner_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Função para limpar ao deletar perfil
CREATE OR REPLACE FUNCTION public.cleanup_profile_identifier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identifier TEXT;
  v_identifier_type TEXT;
BEGIN
  -- Determinar qual identificador limpar baseado no profile_type
  IF OLD.profile_type = 'user' THEN
    v_identifier := OLD.username;
    v_identifier_type := 'username';
  ELSIF OLD.profile_type = 'business' THEN
    v_identifier := OLD.slug;
    v_identifier_type := 'business_slug';
  ELSE
    RETURN OLD;
  END IF;
  
  -- Limpar o identificador se existir
  IF v_identifier IS NOT NULL AND v_identifier != '' THEN
    DELETE FROM public.global_identifiers
    WHERE identifier = LOWER(v_identifier)
      AND identifier_type = v_identifier_type
      AND owner_id = OLD.id;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Recriar triggers na tabela profiles unificada
DROP TRIGGER IF EXISTS trg_register_profile_username ON public.profiles;
DROP TRIGGER IF EXISTS trg_update_profile_username ON public.profiles;
DROP TRIGGER IF EXISTS trg_cleanup_profile_identifier ON public.profiles;

-- Criar novos triggers unificados
CREATE TRIGGER trg_register_profile_identifier
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.register_profile_identifier();

CREATE TRIGGER trg_update_profile_identifier
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_identifier();

CREATE TRIGGER trg_cleanup_profile_identifier
  AFTER DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_profile_identifier();