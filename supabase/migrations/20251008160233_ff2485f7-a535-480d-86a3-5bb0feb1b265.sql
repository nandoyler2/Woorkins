-- Add status column to proposals if not exists
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Create proposal_messages table for direct messages between project owner and proposal sender
CREATE TABLE IF NOT EXISTS proposal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on proposal_messages
ALTER TABLE proposal_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for proposal_messages
CREATE POLICY "Users can view messages for their proposals"
  ON proposal_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_messages.proposal_id
      AND (
        p.freelancer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM projects pr
          JOIN profiles pf ON pf.id = pr.profile_id
          WHERE pr.id = p.project_id AND pf.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can send messages for their proposals"
  ON proposal_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_messages.proposal_id
      AND (
        (p.freelancer_id = auth.uid() AND sender_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM projects pr
          JOIN profiles pf ON pf.id = pr.profile_id
          WHERE pr.id = p.project_id AND pf.user_id = auth.uid() AND sender_id = auth.uid()
        )
      )
    )
  );

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = notifications.user_id
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = notifications.user_id
    AND profiles.user_id = auth.uid()
  ));

-- Enable realtime for proposal_messages
ALTER PUBLICATION supabase_realtime ADD TABLE proposal_messages;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable realtime for negotiation_messages
ALTER PUBLICATION supabase_realtime ADD TABLE negotiation_messages;

-- Function to create notification for new proposal
CREATE OR REPLACE FUNCTION notify_new_proposal()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new proposals
DROP TRIGGER IF EXISTS on_proposal_created ON proposals;
CREATE TRIGGER on_proposal_created
  AFTER INSERT ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_proposal();

-- Function to create notification for new proposal message
CREATE OR REPLACE FUNCTION notify_new_proposal_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify the other party in the conversation
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new proposal messages
DROP TRIGGER IF EXISTS on_proposal_message_created ON proposal_messages;
CREATE TRIGGER on_proposal_message_created
  AFTER INSERT ON proposal_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_proposal_message();

-- Function to create notification for new negotiation message
CREATE OR REPLACE FUNCTION notify_new_negotiation_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify the other party in the negotiation
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new negotiation messages
DROP TRIGGER IF EXISTS on_negotiation_message_created ON negotiation_messages;
CREATE TRIGGER on_negotiation_message_created
  AFTER INSERT ON negotiation_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_negotiation_message();