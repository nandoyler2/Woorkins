-- Criar tabela para gerenciar identificadores únicos globalmente
CREATE TABLE IF NOT EXISTS public.global_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL UNIQUE,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('username', 'business_slug')),
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_global_identifiers_identifier ON public.global_identifiers(identifier);
CREATE INDEX IF NOT EXISTS idx_global_identifiers_owner ON public.global_identifiers(owner_id);

-- RLS
ALTER TABLE public.global_identifiers ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Everyone can read identifiers"
  ON public.global_identifiers
  FOR SELECT
  USING (true);

CREATE POLICY "System can manage identifiers"
  ON public.global_identifiers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Função para verificar disponibilidade de identificador
CREATE OR REPLACE FUNCTION public.check_identifier_available(p_identifier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.global_identifiers
    WHERE LOWER(identifier) = LOWER(p_identifier)
  );
END;
$$;

-- Função para registrar username de perfil
CREATE OR REPLACE FUNCTION public.register_profile_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o username já existe
  IF NOT public.check_identifier_available(NEW.username) THEN
    RAISE EXCEPTION 'Username já está em uso';
  END IF;
  
  -- Registrar o username
  INSERT INTO public.global_identifiers (identifier, identifier_type, owner_id)
  VALUES (LOWER(NEW.username), 'username', NEW.id);
  
  RETURN NEW;
END;
$$;

-- Função para registrar slug de negócio
CREATE OR REPLACE FUNCTION public.register_business_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o slug já existe
  IF NOT public.check_identifier_available(NEW.slug) THEN
    RAISE EXCEPTION 'Slug já está em uso';
  END IF;
  
  -- Registrar o slug
  INSERT INTO public.global_identifiers (identifier, identifier_type, owner_id)
  VALUES (LOWER(NEW.slug), 'business_slug', NEW.id);
  
  RETURN NEW;
END;
$$;

-- Função para atualizar username de perfil
CREATE OR REPLACE FUNCTION public.update_profile_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o username mudou
  IF OLD.username != NEW.username THEN
    -- Verificar se o novo username está disponível
    IF NOT public.check_identifier_available(NEW.username) THEN
      RAISE EXCEPTION 'Username já está em uso';
    END IF;
    
    -- Atualizar o registro
    UPDATE public.global_identifiers
    SET identifier = LOWER(NEW.username),
        updated_at = now()
    WHERE identifier = LOWER(OLD.username)
      AND identifier_type = 'username'
      AND owner_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Função para atualizar slug de negócio
CREATE OR REPLACE FUNCTION public.update_business_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o slug mudou
  IF OLD.slug != NEW.slug THEN
    -- Verificar se o novo slug está disponível
    IF NOT public.check_identifier_available(NEW.slug) THEN
      RAISE EXCEPTION 'Slug já está em uso';
    END IF;
    
    -- Atualizar o registro
    UPDATE public.global_identifiers
    SET identifier = LOWER(NEW.slug),
        updated_at = now()
    WHERE identifier = LOWER(OLD.slug)
      AND identifier_type = 'business_slug'
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
BEGIN
  DELETE FROM public.global_identifiers
  WHERE identifier = LOWER(OLD.username)
    AND identifier_type = 'username'
    AND owner_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Função para limpar ao deletar negócio
CREATE OR REPLACE FUNCTION public.cleanup_business_identifier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.global_identifiers
  WHERE identifier = LOWER(OLD.slug)
    AND identifier_type = 'business_slug'
    AND owner_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Criar triggers para profiles
DROP TRIGGER IF EXISTS trg_register_profile_username ON public.profiles;
CREATE TRIGGER trg_register_profile_username
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.register_profile_username();

DROP TRIGGER IF EXISTS trg_update_profile_username ON public.profiles;
CREATE TRIGGER trg_update_profile_username
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_username();

DROP TRIGGER IF EXISTS trg_cleanup_profile_identifier ON public.profiles;
CREATE TRIGGER trg_cleanup_profile_identifier
  AFTER DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_profile_identifier();

-- Criar triggers para business_profiles
DROP TRIGGER IF EXISTS trg_register_business_slug ON public.business_profiles;
CREATE TRIGGER trg_register_business_slug
  AFTER INSERT ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.register_business_slug();

DROP TRIGGER IF EXISTS trg_update_business_slug ON public.business_profiles;
CREATE TRIGGER trg_update_business_slug
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_business_slug();

DROP TRIGGER IF EXISTS trg_cleanup_business_identifier ON public.business_profiles;
CREATE TRIGGER trg_cleanup_business_identifier
  AFTER DELETE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_business_identifier();

-- Migrar dados existentes para a tabela de identificadores
INSERT INTO public.global_identifiers (identifier, identifier_type, owner_id)
SELECT LOWER(username), 'username', id
FROM public.profiles
WHERE username IS NOT NULL
ON CONFLICT (identifier) DO NOTHING;

INSERT INTO public.global_identifiers (identifier, identifier_type, owner_id)
SELECT LOWER(slug), 'business_slug', id
FROM public.business_profiles
WHERE slug IS NOT NULL
ON CONFLICT (identifier) DO NOTHING;