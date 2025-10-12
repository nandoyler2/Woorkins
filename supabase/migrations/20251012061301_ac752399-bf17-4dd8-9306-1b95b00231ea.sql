-- Update notification links to point to unified /messages
CREATE OR REPLACE FUNCTION public.notify_new_negotiation_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    '/messages?type=negotiation&id=' || NEW.negotiation_id
  FROM negotiations n
  JOIN business_profiles bp ON bp.id = n.business_id
  WHERE n.id = NEW.negotiation_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_proposal_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    '/messages?type=proposal&id=' || NEW.proposal_id
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

CREATE OR REPLACE FUNCTION public.notify_new_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT 
    p.profile_id,
    'proposal',
    'Nova proposta recebida',
    'Você recebeu uma nova proposta para: ' || p.title,
    '/messages?type=proposal&id=' || NEW.id
  FROM projects p
  WHERE p.id = NEW.project_id;
  
  RETURN NEW;
END;
$$;