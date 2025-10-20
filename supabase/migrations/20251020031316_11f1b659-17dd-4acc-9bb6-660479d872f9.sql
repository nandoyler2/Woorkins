-- Corrigir tabela evaluations para usar profile_id ao invés de user_id do auth
-- E adicionar foreign keys adequadas

-- 1. Verificar se há dados na tabela antes de fazer alterações
-- (comentário apenas para referência)

-- 2. Adicionar foreign keys que faltam
ALTER TABLE public.evaluations
  DROP CONSTRAINT IF EXISTS evaluations_user_id_fkey,
  DROP CONSTRAINT IF EXISTS evaluations_business_id_fkey;

-- 3. user_id deve referenciar profiles.id (não auth.users.id)
ALTER TABLE public.evaluations
  ADD CONSTRAINT evaluations_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- 4. business_id deve referenciar profiles.id
ALTER TABLE public.evaluations
  ADD CONSTRAINT evaluations_business_id_fkey
  FOREIGN KEY (business_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- 5. Atualizar RLS policy para INSERT - usar profiles.id ao invés de auth.uid()
DROP POLICY IF EXISTS "Authenticated users can create evaluations" ON public.evaluations;

CREATE POLICY "Authenticated users can create evaluations"
  ON public.evaluations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = evaluations.user_id
        AND profiles.user_id = auth.uid()
    )
  );

-- 6. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON public.evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_business_id ON public.evaluations(business_id);