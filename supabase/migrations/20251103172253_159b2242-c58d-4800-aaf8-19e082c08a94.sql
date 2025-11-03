-- Adicionar campos para gerenciar favoritos e visibilidade na caixa de entrada

-- Para negotiations
ALTER TABLE negotiations
ADD COLUMN IF NOT EXISTS is_favorited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hide_from_inbox BOOLEAN DEFAULT false;

-- Para proposals  
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS is_favorited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hide_from_inbox BOOLEAN DEFAULT false;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_negotiations_is_favorited ON negotiations(is_favorited) WHERE is_favorited = true;
CREATE INDEX IF NOT EXISTS idx_negotiations_hide_from_inbox ON negotiations(hide_from_inbox) WHERE hide_from_inbox = true;
CREATE INDEX IF NOT EXISTS idx_proposals_is_favorited ON proposals(is_favorited) WHERE is_favorited = true;
CREATE INDEX IF NOT EXISTS idx_proposals_hide_from_inbox ON proposals(hide_from_inbox) WHERE hide_from_inbox = true;