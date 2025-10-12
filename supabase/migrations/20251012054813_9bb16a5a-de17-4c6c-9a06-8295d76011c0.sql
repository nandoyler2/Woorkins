-- Add status tracking fields to negotiation_messages
ALTER TABLE negotiation_messages
ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read')),
ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

-- Add status tracking fields to proposal_messages
ALTER TABLE proposal_messages
ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read')),
ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

-- Create table for unread message counts
CREATE TABLE IF NOT EXISTS message_unread_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  conversation_type text NOT NULL CHECK (conversation_type IN ('negotiation', 'proposal')),
  unread_count integer DEFAULT 0,
  last_read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, conversation_id, conversation_type)
);

-- Create table for typing indicators
CREATE TABLE IF NOT EXISTS typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  conversation_type text NOT NULL CHECK (conversation_type IN ('negotiation', 'proposal')),
  is_typing boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, conversation_id, conversation_type)
);

-- Enable RLS
ALTER TABLE message_unread_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_unread_counts
CREATE POLICY "Users can view their own unread counts"
ON message_unread_counts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = message_unread_counts.user_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own unread counts"
ON message_unread_counts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = message_unread_counts.user_id
    AND profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = message_unread_counts.user_id
    AND profiles.user_id = auth.uid()
  )
);

-- RLS policies for typing_indicators
CREATE POLICY "Users can view typing indicators in their conversations"
ON typing_indicators FOR SELECT
USING (
  -- For negotiations
  (conversation_type = 'negotiation' AND EXISTS (
    SELECT 1 FROM negotiations n
    WHERE n.id = typing_indicators.conversation_id
    AND (n.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM business_profiles bp
      JOIN profiles p ON p.id = bp.profile_id
      WHERE bp.id = n.business_id AND p.user_id = auth.uid()
    ))
  ))
  OR
  -- For proposals
  (conversation_type = 'proposal' AND EXISTS (
    SELECT 1 FROM proposals pr
    WHERE pr.id = typing_indicators.conversation_id
    AND (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = pr.freelancer_id AND profiles.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM projects pj
      JOIN profiles p ON p.id = pj.profile_id
      WHERE pj.id = pr.project_id AND p.user_id = auth.uid()
    ))
  ))
);

CREATE POLICY "Users can update their own typing indicators"
ON typing_indicators FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = typing_indicators.user_id
    AND profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = typing_indicators.user_id
    AND profiles.user_id = auth.uid()
  )
);

-- Enable realtime for typing indicators
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;

-- Create function to clean up old typing indicators
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE updated_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_unread_counts_user ON message_unread_counts(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation ON typing_indicators(conversation_id, conversation_type);
CREATE INDEX IF NOT EXISTS idx_negotiation_messages_status ON negotiation_messages(status);
CREATE INDEX IF NOT EXISTS idx_proposal_messages_status ON proposal_messages(status);