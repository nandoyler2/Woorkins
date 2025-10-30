-- Adicionar colunas para sistema de conclusão com 72h
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS completion_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS owner_confirmation_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_completed BOOLEAN DEFAULT false;

-- Adicionar índice para consultas eficientes do cron job
CREATE INDEX IF NOT EXISTS idx_proposals_auto_complete 
ON proposals(work_status, owner_confirmation_deadline) 
WHERE work_status = 'freelancer_completed' AND escrow_released_at IS NULL;