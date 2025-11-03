-- Adicionar coluna pinned_at para fixar conversas
ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_negotiations_pinned_at ON public.negotiations(pinned_at DESC) WHERE pinned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_pinned_at ON public.proposals(pinned_at DESC) WHERE pinned_at IS NOT NULL;