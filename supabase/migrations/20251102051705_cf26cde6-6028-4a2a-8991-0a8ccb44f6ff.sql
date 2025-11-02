-- Função para formatar nomes curtos (primeiro nome + sobrenome, considerando preposições)
CREATE OR REPLACE FUNCTION format_short_name(name TEXT)
RETURNS TEXT AS $$
DECLARE
  words TEXT[];
  first_name TEXT;
  first_last_name TEXT;
  second_word TEXT;
BEGIN
  IF name IS NULL OR TRIM(name) = '' THEN
    RETURN '';
  END IF;
  
  -- Formatar o nome completo primeiro
  name := format_full_name(name);
  
  -- Dividir em palavras
  words := STRING_TO_ARRAY(name, ' ');
  
  -- Se só tem uma palavra, retornar ela
  IF ARRAY_LENGTH(words, 1) = 1 THEN
    RETURN words[1];
  END IF;
  
  first_name := words[1];
  first_last_name := words[2];
  
  -- Se o primeiro sobrenome for "de" ou "da" e existir uma terceira palavra, incluir também
  IF (first_last_name = 'de' OR first_last_name = 'da') AND ARRAY_LENGTH(words, 1) > 2 THEN
    second_word := words[3];
    RETURN first_name || ' ' || first_last_name || ' ' || second_word;
  END IF;
  
  RETURN first_name || ' ' || first_last_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Atualizar a função de notificação para usar formato curto
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  recipient_id UUID;
  conversation_type TEXT;
  notification_link TEXT;
BEGIN
  -- Handle negotiation messages
  IF TG_TABLE_NAME = 'negotiation_messages' THEN
    -- Get sender name (formato curto)
    SELECT format_short_name(p.full_name) INTO sender_name
    FROM profiles p
    WHERE p.id = NEW.sender_id;
    
    -- Determine recipient based on sender type
    IF NEW.sender_type = 'user' THEN
      -- If sender is user, notify business
      SELECT bp.profile_id INTO recipient_id
      FROM negotiations n
      JOIN business_profiles bp ON bp.id = n.business_id
      WHERE n.id = NEW.negotiation_id;
    ELSE
      -- If sender is business, notify user
      SELECT p.id INTO recipient_id
      FROM negotiations n
      JOIN profiles p ON p.user_id = n.user_id
      WHERE n.id = NEW.negotiation_id;
    END IF;
    
    conversation_type := 'negotiation';
    notification_link := '/mensagens?negotiation=' || NEW.negotiation_id;
    
  -- Handle proposal messages
  ELSIF TG_TABLE_NAME = 'proposal_messages' THEN
    -- Get sender name (formato curto)
    SELECT format_short_name(p.full_name) INTO sender_name
    FROM profiles p
    WHERE p.id = NEW.sender_id;
    
    -- Determine recipient (if sender is freelancer, notify project owner, and vice versa)
    SELECT 
      CASE 
        WHEN pr.freelancer_id = NEW.sender_id THEN proj.profile_id
        ELSE pr.freelancer_id
      END INTO recipient_id
    FROM proposals pr
    JOIN projects proj ON proj.id = pr.project_id
    WHERE pr.id = NEW.proposal_id;
    
    conversation_type := 'proposal';
    notification_link := '/mensagens?proposal=' || NEW.proposal_id;
  END IF;
  
  -- Only create notification if recipient is different from sender
  IF recipient_id IS NOT NULL AND recipient_id != NEW.sender_id THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link
    ) VALUES (
      recipient_id,
      'message',
      'Mensagem de: ' || COALESCE(sender_name, 'Usuário'),
      SUBSTRING(NEW.content, 1, 100),
      notification_link
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';