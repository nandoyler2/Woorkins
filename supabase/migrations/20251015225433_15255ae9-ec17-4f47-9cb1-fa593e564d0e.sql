-- Permitir que edge functions (service role) também possam inserir verificações
-- além dos usuários normais

DROP POLICY IF EXISTS "Users can insert their own verification" ON public.document_verifications;

CREATE POLICY "Users and system can insert verifications"
ON public.document_verifications
FOR INSERT
TO authenticated, service_role
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = document_verifications.profile_id
      AND profiles.user_id = auth.uid()
  )
  OR auth.role() = 'service_role'
);
