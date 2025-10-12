-- Add fields to proposals table for negotiation workflow
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS is_unlocked boolean DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS owner_has_messaged boolean DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS current_proposal_amount numeric;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS current_proposal_by uuid REFERENCES profiles(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS awaiting_acceptance_from uuid REFERENCES profiles(id);

-- Create counter_proposals table
CREATE TABLE IF NOT EXISTS counter_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  from_profile_id uuid REFERENCES profiles(id) NOT NULL,
  to_profile_id uuid REFERENCES profiles(id) NOT NULL,
  amount numeric NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  responded_at timestamp with time zone
);

-- Enable RLS on counter_proposals
ALTER TABLE counter_proposals ENABLE ROW LEVEL SECURITY;

-- RLS policies for counter_proposals
CREATE POLICY "Users can view counter proposals for their proposals"
ON counter_proposals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = counter_proposals.proposal_id
    AND (
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = p.freelancer_id AND profiles.user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM projects pr 
        JOIN profiles ON profiles.id = pr.profile_id 
        WHERE pr.id = p.project_id AND profiles.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can create counter proposals"
ON counter_proposals FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = counter_proposals.from_profile_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their counter proposals"
ON counter_proposals FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = counter_proposals.to_profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Add moderation fields to messages
ALTER TABLE proposal_messages ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'approved';
ALTER TABLE proposal_messages ADD COLUMN IF NOT EXISTS moderation_reason text;
ALTER TABLE negotiation_messages ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'approved';
ALTER TABLE negotiation_messages ADD COLUMN IF NOT EXISTS moderation_reason text;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_counter_proposals_proposal_id ON counter_proposals(proposal_id);
CREATE INDEX IF NOT EXISTS idx_counter_proposals_status ON counter_proposals(status);