-- Enable realtime for message_unread_counts table
ALTER PUBLICATION supabase_realtime ADD TABLE message_unread_counts;

-- Function to update unread count when a new message is sent
CREATE OR REPLACE FUNCTION update_unread_count_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_id uuid;
  v_conversation_id uuid;
  v_conversation_type text;
  v_recipient_id uuid;
BEGIN
  -- Get conversation details based on message type
  IF TG_TABLE_NAME = 'negotiation_messages' THEN
    v_conversation_id := NEW.negotiation_id;
    v_conversation_type := 'negotiation';
    v_sender_id := NEW.sender_id;
    
    -- Get recipient (the other party in the negotiation)
    SELECT 
      CASE 
        WHEN n.user_id = NEW.sender_id THEN bp.profile_id
        ELSE n.user_id
      END INTO v_recipient_id
    FROM negotiations n
    LEFT JOIN business_profiles bp ON bp.id = n.business_id
    WHERE n.id = NEW.negotiation_id;
    
  ELSIF TG_TABLE_NAME = 'proposal_messages' THEN
    v_conversation_id := NEW.proposal_id;
    v_conversation_type := 'proposal';
    v_sender_id := NEW.sender_id;
    
    -- Get recipient (the other party in the proposal)
    SELECT 
      CASE 
        WHEN p.freelancer_id = NEW.sender_id THEN pr.profile_id
        ELSE p.freelancer_id
      END INTO v_recipient_id
    FROM proposals p
    JOIN projects pr ON pr.id = p.project_id
    WHERE p.id = NEW.proposal_id;
  END IF;
  
  -- Increment unread count for recipient
  IF v_recipient_id IS NOT NULL THEN
    INSERT INTO message_unread_counts (
      user_id,
      conversation_id,
      conversation_type,
      unread_count
    ) VALUES (
      v_recipient_id,
      v_conversation_id,
      v_conversation_type,
      1
    )
    ON CONFLICT (user_id, conversation_id, conversation_type)
    DO UPDATE SET 
      unread_count = message_unread_counts.unread_count + 1,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset unread count when messages are marked as read
CREATE OR REPLACE FUNCTION update_unread_count_on_read()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id uuid;
  v_conversation_type text;
  v_reader_id uuid;
BEGIN
  -- Only process if status changed to 'read'
  IF NEW.status = 'read' AND OLD.status != 'read' THEN
    -- Get conversation details
    IF TG_TABLE_NAME = 'negotiation_messages' THEN
      v_conversation_id := NEW.negotiation_id;
      v_conversation_type := 'negotiation';
      
      -- Get the reader (opposite of sender)
      SELECT 
        CASE 
          WHEN n.user_id = NEW.sender_id THEN bp.profile_id
          ELSE n.user_id
        END INTO v_reader_id
      FROM negotiations n
      LEFT JOIN business_profiles bp ON bp.id = n.business_id
      WHERE n.id = NEW.negotiation_id;
      
    ELSIF TG_TABLE_NAME = 'proposal_messages' THEN
      v_conversation_id := NEW.proposal_id;
      v_conversation_type := 'proposal';
      
      -- Get the reader (opposite of sender)
      SELECT 
        CASE 
          WHEN p.freelancer_id = NEW.sender_id THEN pr.profile_id
          ELSE p.freelancer_id
        END INTO v_reader_id
      FROM proposals p
      JOIN projects pr ON pr.id = p.project_id
      WHERE p.id = NEW.proposal_id;
    END IF;
    
    -- Decrement unread count
    IF v_reader_id IS NOT NULL THEN
      UPDATE message_unread_counts
      SET 
        unread_count = GREATEST(0, unread_count - 1),
        last_read_at = now(),
        updated_at = now()
      WHERE user_id = v_reader_id
        AND conversation_id = v_conversation_id
        AND conversation_type = v_conversation_type;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for negotiation messages
DROP TRIGGER IF EXISTS trigger_update_unread_on_negotiation_message ON negotiation_messages;
CREATE TRIGGER trigger_update_unread_on_negotiation_message
  AFTER INSERT ON negotiation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_unread_count_on_new_message();

DROP TRIGGER IF EXISTS trigger_update_unread_on_negotiation_read ON negotiation_messages;
CREATE TRIGGER trigger_update_unread_on_negotiation_read
  AFTER UPDATE ON negotiation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_unread_count_on_read();

-- Create triggers for proposal messages
DROP TRIGGER IF EXISTS trigger_update_unread_on_proposal_message ON proposal_messages;
CREATE TRIGGER trigger_update_unread_on_proposal_message
  AFTER INSERT ON proposal_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_unread_count_on_new_message();

DROP TRIGGER IF EXISTS trigger_update_unread_on_proposal_read ON proposal_messages;
CREATE TRIGGER trigger_update_unread_on_proposal_read
  AFTER UPDATE ON proposal_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_unread_count_on_read();

-- Add unique constraint to message_unread_counts if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_conversation'
  ) THEN
    ALTER TABLE message_unread_counts 
    ADD CONSTRAINT unique_user_conversation 
    UNIQUE (user_id, conversation_id, conversation_type);
  END IF;
END $$;