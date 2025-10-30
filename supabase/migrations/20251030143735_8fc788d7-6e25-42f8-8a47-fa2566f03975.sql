-- Adicionar colunas para comprovante e notas do admin na tabela withdrawal_requests
ALTER TABLE withdrawal_requests
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES profiles(id);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_profile_id ON withdrawal_requests(profile_id);

-- Adicionar políticas RLS para admins gerenciarem saques
CREATE POLICY "Admins can view all withdrawal requests"
ON withdrawal_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update withdrawal requests"
ON withdrawal_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);