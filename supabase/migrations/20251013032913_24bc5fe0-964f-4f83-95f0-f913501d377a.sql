-- Fix security linter: set search_path for functions we created
CREATE OR REPLACE FUNCTION public.update_unread_count_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_id uuid;
  v_conversation_id uuid;
  v_conversation_type text;
  v_recipient_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'negotiation_messages' THEN
    v_conversation_id := NEW.negotiation_id;
    v_conversation_type := 'negotiation';
    v_sender_id := NEW.sender_id;
    SELECT 
      CASE WHEN n.user_id = NEW.sender_id THEN bp.profile_id ELSE n.user_id END
      INTO v_recipient_id
    FROM public.negotiations n
    LEFT JOIN public.business_profiles bp ON bp.id = n.business_id
    WHERE n.id = NEW.negotiation_id;
  ELSIF TG_TABLE_NAME = 'proposal_messages' THEN
    v_conversation_id := NEW.proposal_id;
    v_conversation_type := 'proposal';
    v_sender_id := NEW.sender_id;
    SELECT 
      CASE WHEN p.freelancer_id = NEW.sender_id THEN pr.profile_id ELSE p.freelancer_id END
      INTO v_recipient_id
    FROM public.proposals p
    JOIN public.projects pr ON pr.id = p.project_id
    WHERE p.id = NEW.proposal_id;
  END IF;

  IF v_recipient_id IS NOT NULL THEN
    INSERT INTO public.message_unread_counts (user_id, conversation_id, conversation_type, unread_count)
    VALUES (v_recipient_id, v_conversation_id, v_conversation_type, 1)
    ON CONFLICT (user_id, conversation_id, conversation_type)
    DO UPDATE SET unread_count = public.message_unread_counts.unread_count + 1, updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_unread_count_on_read()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id uuid;
  v_conversation_type text;
  v_reader_id uuid;
BEGIN
  IF NEW.status = 'read' AND OLD.status <> 'read' THEN
    IF TG_TABLE_NAME = 'negotiation_messages' THEN
      v_conversation_id := NEW.negotiation_id;
      v_conversation_type := 'negotiation';
      SELECT CASE WHEN n.user_id = NEW.sender_id THEN bp.profile_id ELSE n.user_id END
        INTO v_reader_id
      FROM public.negotiations n
      LEFT JOIN public.business_profiles bp ON bp.id = n.business_id
      WHERE n.id = NEW.negotiation_id;
    ELSIF TG_TABLE_NAME = 'proposal_messages' THEN
      v_conversation_id := NEW.proposal_id;
      v_conversation_type := 'proposal';
      SELECT CASE WHEN p.freelancer_id = NEW.sender_id THEN pr.profile_id ELSE p.freelancer_id END
        INTO v_reader_id
      FROM public.proposals p
      JOIN public.projects pr ON pr.id = p.project_id
      WHERE p.id = NEW.proposal_id;
    END IF;

    IF v_reader_id IS NOT NULL THEN
      UPDATE public.message_unread_counts
      SET unread_count = GREATEST(0, unread_count - 1), last_read_at = now(), updated_at = now()
      WHERE user_id = v_reader_id AND conversation_id = v_conversation_id AND conversation_type = v_conversation_type;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;