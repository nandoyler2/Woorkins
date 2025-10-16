-- Criar tabela de planos de assinatura
CREATE TABLE IF NOT EXISTS public.user_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'basic', 'premium', 'enterprise')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, is_active)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_subscription_plans_user_id ON public.user_subscription_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscription_plans_active ON public.user_subscription_plans(is_active) WHERE is_active = true;

-- Habilitar RLS
ALTER TABLE public.user_subscription_plans ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_subscription_plans' AND policyname = 'Users can view their own subscription plan'
  ) THEN
    CREATE POLICY "Users can view their own subscription plan"
      ON public.user_subscription_plans
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_subscription_plans' AND policyname = 'Admins can view all subscription plans'
  ) THEN
    CREATE POLICY "Admins can view all subscription plans"
      ON public.user_subscription_plans
      FOR SELECT
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_subscription_plans' AND policyname = 'Admins can manage subscription plans'
  ) THEN
    CREATE POLICY "Admins can manage subscription plans"
      ON public.user_subscription_plans
      FOR ALL
      USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Adicionar novos campos na tabela profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS filiation TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS place_of_birth TEXT;

-- Função para atualizar birth_date automaticamente quando documento é aprovado
CREATE OR REPLACE FUNCTION public.update_profile_from_verified_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Somente quando o status mudar para 'approved'
  IF NEW.verification_status = 'approved' AND OLD.verification_status != 'approved' THEN
    -- Atualizar o perfil com os dados extraídos do documento
    UPDATE public.profiles
    SET 
      birth_date = NEW.extracted_birth_date,
      document_verified = true,
      document_verification_status = 'approved',
      full_name = COALESCE(NEW.extracted_name, full_name),
      cpf = COALESCE(NEW.extracted_cpf, cpf),
      -- Extrair filiação do ai_analysis se existir
      filiation = COALESCE(
        NEW.ai_analysis->>'filiation',
        NEW.ai_analysis->>'mother_name',
        filiation
      ),
      -- Extrair naturalidade/nacionalidade do ai_analysis se existir
      nationality = COALESCE(
        NEW.ai_analysis->>'nationality',
        nationality
      ),
      place_of_birth = COALESCE(
        NEW.ai_analysis->>'place_of_birth',
        NEW.ai_analysis->>'birth_place',
        place_of_birth
      ),
      updated_at = now()
    WHERE id = NEW.profile_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para atualizar perfil quando documento é aprovado
DROP TRIGGER IF EXISTS trigger_update_profile_from_verified_document ON public.document_verifications;
CREATE TRIGGER trigger_update_profile_from_verified_document
  AFTER UPDATE ON public.document_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_from_verified_document();