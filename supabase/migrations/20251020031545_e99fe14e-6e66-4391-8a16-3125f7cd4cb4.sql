-- Correção completa da tabela evaluations: foreign keys, RLS policies e índices

-- 1. Remover constraints antigos se existirem
ALTER TABLE public.evaluations
  DROP CONSTRAINT IF EXISTS evaluations_user_id_fkey CASCADE,
  DROP CONSTRAINT IF EXISTS evaluations_business_id_fkey CASCADE;

-- 2. Adicionar foreign keys corretas
-- user_id deve referenciar profiles.id (quem fez a avaliação)
ALTER TABLE public.evaluations
  ADD CONSTRAINT evaluations_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- business_id deve referenciar profiles.id (quem está sendo avaliado)
ALTER TABLE public.evaluations
  ADD CONSTRAINT evaluations_business_id_fkey
  FOREIGN KEY (business_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- 3. Corrigir RLS policy de UPDATE que está usando auth.uid() diretamente
DROP POLICY IF EXISTS "Users can update their own evaluations" ON public.evaluations;

CREATE POLICY "Users can update their own evaluations"
  ON public.evaluations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = evaluations.user_id
        AND profiles.user_id = auth.uid()
    )
  );

-- 4. Adicionar policy para DELETE (permitir que usuário delete suas próprias avaliações)
DROP POLICY IF EXISTS "Users can delete their own evaluations" ON public.evaluations;

CREATE POLICY "Users can delete their own evaluations"
  ON public.evaluations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = evaluations.user_id
        AND profiles.user_id = auth.uid()
    )
  );

-- 5. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON public.evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_business_id ON public.evaluations(business_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_category ON public.evaluations(evaluation_category);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON public.evaluations(created_at DESC);

-- 6. Criar índice composto para queries comuns (buscar avaliações de um negócio por categoria)
CREATE INDEX IF NOT EXISTS idx_evaluations_business_category 
  ON public.evaluations(business_id, evaluation_category, created_at DESC);