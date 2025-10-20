-- Adicionar campo 'read' na tabela support_messages
ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;

-- Adicionar campo 'last_agent_message_at' na tabela support_conversations
ALTER TABLE support_conversations 
ADD COLUMN IF NOT EXISTS last_agent_message_at TIMESTAMP WITH TIME ZONE;

-- Criar índice para melhor performance nas consultas de mensagens não lidas
CREATE INDEX IF NOT EXISTS idx_support_messages_read ON support_messages(conversation_id, sender_type, read) 
WHERE sender_type = 'agent' AND read = false;