-- Adicionar campo de resposta do dono do perfil nas avaliações
ALTER TABLE public.evaluations
ADD COLUMN IF NOT EXISTS owner_response TEXT,
ADD COLUMN IF NOT EXISTS owner_response_at TIMESTAMP WITH TIME ZONE;

-- Criar função para notificar dono do perfil quando receber avaliação
CREATE OR REPLACE FUNCTION public.notify_profile_owner_on_evaluation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Notificar o dono do perfil avaliado
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT 
    p.user_id,
    'evaluation',
    'Nova avaliação recebida',
    'Você recebeu uma nova avaliação',
    '/' || p.username || '?tab=' || CASE 
      WHEN NEW.evaluation_category = 'positive' THEN 'avaliacoes'
      ELSE 'reclamacoes'
    END
  FROM profiles p
  WHERE p.id = NEW.business_id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para notificação de nova avaliação
DROP TRIGGER IF EXISTS on_evaluation_created ON public.evaluations;
CREATE TRIGGER on_evaluation_created
  AFTER INSERT ON public.evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_profile_owner_on_evaluation();

-- Criar função para notificar avaliador quando houver resposta
CREATE OR REPLACE FUNCTION public.notify_evaluator_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se o campo owner_response foi preenchido e antes estava vazio
  IF NEW.owner_response IS NOT NULL AND (OLD.owner_response IS NULL OR OLD.owner_response = '') THEN
    -- Notificar o avaliador
    INSERT INTO notifications (user_id, type, title, message, link)
    SELECT 
      p.user_id,
      'evaluation_response',
      'Resposta à sua avaliação',
      'O perfil que você avaliou respondeu',
      '/' || bp.username || '?tab=' || CASE 
        WHEN NEW.evaluation_category = 'positive' THEN 'avaliacoes'
        ELSE 'reclamacoes'
      END
    FROM profiles p
    JOIN profiles bp ON bp.id = NEW.business_id
    WHERE p.id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para notificação de resposta
DROP TRIGGER IF EXISTS on_evaluation_response ON public.evaluations;
CREATE TRIGGER on_evaluation_response
  AFTER UPDATE ON public.evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_evaluator_on_response();