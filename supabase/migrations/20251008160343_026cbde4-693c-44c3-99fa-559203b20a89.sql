-- Fix security warnings by setting search_path on functions
CREATE OR REPLACE FUNCTION notify_new_proposal()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT 
    pr.profile_id,
    'proposal',
    'Nova proposta recebida',
    'Você recebeu uma nova proposta para: ' || p.title,
    '/my-projects'
  FROM projects p
  WHERE p.id = NEW.project_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_new_proposal_message()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT 
    CASE 
      WHEN NEW.sender_id = auth.uid() THEN pr.profile_id
      ELSE p.freelancer_id
    END,
    'message',
    'Nova mensagem',
    'Você recebeu uma nova mensagem sobre uma proposta',
    '/my-projects'
  FROM proposals p
  JOIN projects pr ON pr.id = p.project_id
  WHERE p.id = NEW.proposal_id
  AND NEW.sender_id != CASE 
      WHEN NEW.sender_id = auth.uid() THEN pr.profile_id
      ELSE p.freelancer_id
    END;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_new_negotiation_message()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT 
    CASE 
      WHEN NEW.sender_type = 'user' THEN bp.profile_id
      ELSE n.user_id
    END,
    'negotiation',
    'Nova mensagem de negociação',
    'Você recebeu uma nova mensagem na negociação',
    '/user/orders'
  FROM negotiations n
  JOIN business_profiles bp ON bp.id = n.business_id
  WHERE n.id = NEW.negotiation_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_proposals_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE projects
    SET proposals_count = proposals_count + 1
    WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE projects
    SET proposals_count = proposals_count - 1
    WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$;