-- Adicionar política RLS para permitir que usuários excluam seus próprios perfis profissionais
CREATE POLICY "Users can delete their own business profile"
ON public.business_profiles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = business_profiles.profile_id
    AND profiles.user_id = auth.uid()
  )
);