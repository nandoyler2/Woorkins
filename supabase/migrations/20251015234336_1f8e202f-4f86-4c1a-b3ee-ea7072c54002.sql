-- Adicionar campo para marcar conversas como arquivadas
ALTER TABLE ai_assistant_conversations 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;