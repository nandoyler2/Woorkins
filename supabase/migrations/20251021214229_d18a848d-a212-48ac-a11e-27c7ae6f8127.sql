-- Adicionar campos de arquivamento para negociações
ALTER TABLE public.negotiations
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Adicionar campos de arquivamento para propostas
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Índices para melhorar performance nas consultas de arquivamento
CREATE INDEX IF NOT EXISTS idx_negotiations_archived ON public.negotiations(archived);
CREATE INDEX IF NOT EXISTS idx_proposals_archived ON public.proposals(archived);