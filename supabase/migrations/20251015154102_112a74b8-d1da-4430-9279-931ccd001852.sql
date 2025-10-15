-- Function to create notification when a new message is received
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
    SELECT p.full_name INTO sender_name
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
    SELECT p.full_name INTO sender_name
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS notify_on_negotiation_message ON negotiation_messages;
DROP TRIGGER IF EXISTS notify_on_proposal_message ON proposal_messages;

-- Create triggers for both message tables
CREATE TRIGGER notify_on_negotiation_message
  AFTER INSERT ON negotiation_messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();

CREATE TRIGGER notify_on_proposal_message
  AFTER INSERT ON proposal_messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();