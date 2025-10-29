-- Corrigir search_path das funções criadas anteriormente

CREATE OR REPLACE FUNCTION update_project_disputes_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION log_proposal_acceptance()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    INSERT INTO proposal_status_history (proposal_id, status_type, changed_by, new_value, message)
    VALUES (
      NEW.id,
      'accepted',
      NEW.freelancer_id,
      jsonb_build_object('amount', NEW.current_proposal_amount),
      'Proposta aceita por R$ ' || NEW.current_proposal_amount
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_dispute_opened()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  dispute_type TEXT;
  dispute_title TEXT;
BEGIN
  IF NEW.proposal_id IS NOT NULL THEN
    dispute_type := 'proposal';
    SELECT p.title INTO dispute_title FROM proposals pr
    JOIN projects p ON p.id = pr.project_id
    WHERE pr.id = NEW.proposal_id;
  ELSIF NEW.negotiation_id IS NOT NULL THEN
    dispute_type := 'negotiation';
    dispute_title := 'Negociação';
  END IF;

  -- Notificar a outra parte
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT 
    NEW.against_profile_id,
    'dispute',
    'Nova disputa aberta',
    'Uma disputa foi aberta sobre: ' || dispute_title,
    '/messages?dispute=' || NEW.id;

  -- Notificar admins
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT 
    p.id,
    'dispute',
    'Nova disputa requer análise',
    'Uma disputa foi aberta e requer atenção administrativa',
    '/admin/disputes?id=' || NEW.id
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role = 'admin';

  RETURN NEW;
END;
$$;