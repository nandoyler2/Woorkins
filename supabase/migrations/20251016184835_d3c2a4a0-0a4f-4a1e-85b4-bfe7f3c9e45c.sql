-- Tabela para rastrear comportamento de spam e abusos
CREATE TABLE IF NOT EXISTS message_spam_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  context TEXT NOT NULL, -- 'support_chat' ou 'ai_assistant' ou 'negotiation'
  spam_count INTEGER DEFAULT 0,
  last_spam_at TIMESTAMP WITH TIME ZONE,
  blocked_until TIMESTAMP WITH TIME ZONE,
  block_duration_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id, context)
);

-- Ativar RLS
ALTER TABLE message_spam_tracking ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver seus próprios bloqueios
CREATE POLICY "Users can view their own spam tracking"
  ON message_spam_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = message_spam_tracking.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Política: sistema pode gerenciar tudo
CREATE POLICY "System can manage spam tracking"
  ON message_spam_tracking
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_spam_tracking_profile_context ON message_spam_tracking(profile_id, context);
CREATE INDEX IF NOT EXISTS idx_spam_tracking_blocked_until ON message_spam_tracking(blocked_until);

-- Função para limpar bloqueios expirados
CREATE OR REPLACE FUNCTION cleanup_expired_spam_blocks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE message_spam_tracking
  SET spam_count = 0, last_spam_at = NULL, blocked_until = NULL
  WHERE blocked_until IS NOT NULL 
  AND blocked_until < now();
END;
$$;