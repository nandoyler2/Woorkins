-- Add moderation tracking columns to negotiation_messages
ALTER TABLE negotiation_messages 
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add moderation tracking columns to proposal_messages
ALTER TABLE proposal_messages 
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create indices for better performance on pending messages
CREATE INDEX IF NOT EXISTS idx_negotiation_messages_moderation 
  ON negotiation_messages(moderation_status) 
  WHERE moderation_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_proposal_messages_moderation 
  ON proposal_messages(moderation_status) 
  WHERE moderation_status = 'pending';

-- Create indices for querying approved messages by conversation
CREATE INDEX IF NOT EXISTS idx_negotiation_messages_approved 
  ON negotiation_messages(negotiation_id, moderation_status) 
  WHERE moderation_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_proposal_messages_approved 
  ON proposal_messages(proposal_id, moderation_status) 
  WHERE moderation_status = 'approved';

-- Update existing messages to be approved (backward compatibility)
UPDATE negotiation_messages 
SET moderation_status = 'approved' 
WHERE moderation_status IS NULL OR moderation_status = 'pending';

UPDATE proposal_messages 
SET moderation_status = 'approved' 
WHERE moderation_status IS NULL OR moderation_status = 'pending';