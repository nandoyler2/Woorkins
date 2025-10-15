-- Add deleted column to negotiation_messages table
ALTER TABLE negotiation_messages 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_negotiation_messages_deleted 
ON negotiation_messages(is_deleted);