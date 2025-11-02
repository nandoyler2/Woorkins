-- Função para formatar nomes (primeira letra maiúscula, preposições em minúsculo)
CREATE OR REPLACE FUNCTION format_full_name(name TEXT)
RETURNS TEXT AS $$
DECLARE
  lowercase_words TEXT[] := ARRAY['de', 'da', 'do', 'dos', 'das', 'e', 'para', 'com', 'em', 'a', 'o'];
  words TEXT[];
  formatted_words TEXT[];
  word TEXT;
  i INTEGER;
BEGIN
  IF name IS NULL OR TRIM(name) = '' THEN
    RETURN '';
  END IF;
  
  -- Converter para minúsculas e dividir em palavras
  words := STRING_TO_ARRAY(LOWER(TRIM(name)), ' ');
  formatted_words := ARRAY[]::TEXT[];
  
  -- Processar cada palavra
  FOR i IN 1..ARRAY_LENGTH(words, 1) LOOP
    word := words[i];
    
    -- Pular palavras vazias
    IF word = '' THEN
      CONTINUE;
    END IF;
    
    -- Primeira palavra sempre maiúscula, mesmo que seja preposição
    IF i = 1 THEN
      formatted_words := ARRAY_APPEND(formatted_words, INITCAP(word));
    -- Preposições em minúsculo
    ELSIF word = ANY(lowercase_words) THEN
      formatted_words := ARRAY_APPEND(formatted_words, word);
    -- Outras palavras com primeira letra maiúscula
    ELSE
      formatted_words := ARRAY_APPEND(formatted_words, INITCAP(word));
    END IF;
  END LOOP;
  
  RETURN ARRAY_TO_STRING(formatted_words, ' ');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Atualizar a função de notificação de mensagens para usar a formatação
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
    -- Get sender name
    SELECT format_full_name(p.full_name) INTO sender_name
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
    -- Get sender name
    SELECT format_full_name(p.full_name) INTO sender_name
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