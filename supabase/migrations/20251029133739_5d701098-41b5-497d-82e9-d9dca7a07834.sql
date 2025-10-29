-- ===================================
-- 1. ATUALIZAR TABELA PROPOSALS
-- ===================================

-- Adicionar novos campos à tabela proposals
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS owner_has_messaged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS work_status TEXT DEFAULT 'not_started' CHECK (work_status IN ('not_started', 'in_progress', 'freelancer_completed', 'owner_confirmed', 'completed', 'disputed')),
ADD COLUMN IF NOT EXISTS freelancer_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS owner_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dispute_id UUID,
ADD COLUMN IF NOT EXISTS current_proposal_amount NUMERIC,
ADD COLUMN IF NOT EXISTS awaiting_acceptance_from UUID REFERENCES profiles(id);

-- Inicializar current_proposal_amount com o valor do budget
UPDATE proposals SET current_proposal_amount = budget WHERE current_proposal_amount IS NULL;

-- ===================================
-- 2. CRIAR TABELA PROPOSAL_STATUS_HISTORY
-- ===================================

CREATE TABLE IF NOT EXISTS proposal_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  status_type TEXT NOT NULL CHECK (status_type IN ('proposal_sent', 'counter_proposal', 'accepted', 'payment_made', 'work_started', 'freelancer_completed', 'owner_confirmed', 'completed', 'disputed')),
  changed_by UUID NOT NULL REFERENCES profiles(id),
  old_value JSONB,
  new_value JSONB,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_status_history_proposal ON proposal_status_history(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_status_history_created ON proposal_status_history(created_at DESC);

-- RLS para proposal_status_history
ALTER TABLE proposal_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of their proposals"
ON proposal_status_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_status_history.proposal_id
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

CREATE POLICY "System can insert status history"
ON proposal_status_history FOR INSERT
WITH CHECK (true);

-- ===================================
-- 3. CRIAR TABELA PROJECT_DISPUTES
-- ===================================

CREATE TABLE IF NOT EXISTS project_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  negotiation_id UUID REFERENCES negotiations(id) ON DELETE SET NULL,
  opened_by UUID NOT NULL REFERENCES profiles(id),
  against_profile_id UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved_for_client', 'resolved_for_freelancer', 'resolved_partial', 'closed')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolution TEXT,
  refund_amount NUMERIC DEFAULT 0,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_project_disputes_proposal ON project_disputes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_project_disputes_negotiation ON project_disputes(negotiation_id);
CREATE INDEX IF NOT EXISTS idx_project_disputes_status ON project_disputes(status);
CREATE INDEX IF NOT EXISTS idx_project_disputes_created ON project_disputes(created_at DESC);

-- RLS para project_disputes
ALTER TABLE project_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own disputes"
ON project_disputes FOR SELECT
USING (
  opened_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR against_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can create disputes"
ON project_disputes FOR INSERT
WITH CHECK (
  opened_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can update disputes"
ON project_disputes FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- ===================================
-- 4. CRIAR TABELA DISPUTE_MESSAGES
-- ===================================

CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES project_disputes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'freelancer', 'admin')),
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created ON dispute_messages(created_at);

-- RLS para dispute_messages
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their disputes"
ON dispute_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_disputes d
    WHERE d.id = dispute_messages.dispute_id
    AND (
      d.opened_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      OR d.against_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "Users can send messages in their disputes"
ON dispute_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_disputes d
    WHERE d.id = dispute_messages.dispute_id
    AND (
      d.opened_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      OR d.against_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- ===================================
-- 5. TRIGGERS E FUNCTIONS
-- ===================================

-- Função para atualizar updated_at em project_disputes
CREATE OR REPLACE FUNCTION update_project_disputes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_disputes_updated_at
BEFORE UPDATE ON project_disputes
FOR EACH ROW
EXECUTE FUNCTION update_project_disputes_updated_at();

-- Função para criar entrada de histórico quando proposta é aceita
CREATE OR REPLACE FUNCTION log_proposal_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    INSERT INTO proposal_status_history (proposal_id, status_type, changed_by, new_value, message)
    VALUES (
      NEW.id,
      'accepted',
      NEW.freelancer_id,
      jsonb_build_object('amount', NEW.current_proposal_amount),
      'Proposta aceita por R$ ' || NEW.current_proposal_amount
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_proposal_acceptance
AFTER UPDATE ON proposals
FOR EACH ROW
EXECUTE FUNCTION log_proposal_acceptance();

-- Função para criar notificação quando disputa é aberta
CREATE OR REPLACE FUNCTION notify_dispute_opened()
RETURNS TRIGGER AS $$
DECLARE
  dispute_type TEXT;
  dispute_title TEXT;
BEGIN
  IF NEW.proposal_id IS NOT NULL THEN
    dispute_type := 'proposal';
    SELECT p.title INTO dispute_title FROM proposals pr
    JOIN projects p ON p.id = pr.project_id
    WHERE pr.id = NEW.proposal_id;
  ELSIF NEW.negotiation_id IS NOT NULL THEN
    dispute_type := 'negotiation';
    dispute_title := 'Negociação';
  END IF;

  -- Notificar a outra parte
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT 
    NEW.against_profile_id,
    'dispute',
    'Nova disputa aberta',
    'Uma disputa foi aberta sobre: ' || dispute_title,
    '/messages?dispute=' || NEW.id;

  -- Notificar admins
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT 
    p.id,
    'dispute',
    'Nova disputa requer análise',
    'Uma disputa foi aberta e requer atenção administrativa',
    '/admin/disputes?id=' || NEW.id
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role = 'admin';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_dispute_opened
AFTER INSERT ON project_disputes
FOR EACH ROW
EXECUTE FUNCTION notify_dispute_opened();