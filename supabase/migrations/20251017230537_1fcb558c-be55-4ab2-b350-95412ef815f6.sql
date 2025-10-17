-- Adicionar status e campos de convite na tabela business_admins
ALTER TABLE business_admins 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;

-- Atualizar admins existentes para 'accepted'
UPDATE business_admins SET status = 'accepted' WHERE status = 'pending';