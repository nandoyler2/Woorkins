-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Everyone can read identifiers" ON public.global_identifiers;
DROP POLICY IF EXISTS "System can manage identifiers" ON public.global_identifiers;

-- Recriar políticas corretas
CREATE POLICY "Everyone can read identifiers"
  ON public.global_identifiers
  FOR SELECT
  USING (true);

CREATE POLICY "System can manage identifiers"
  ON public.global_identifiers
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');