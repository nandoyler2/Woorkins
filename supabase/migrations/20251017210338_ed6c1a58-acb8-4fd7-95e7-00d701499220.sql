-- Corrigir política RLS para permitir soft delete de business_profiles pelos próprios usuários
DROP POLICY IF EXISTS "Users can update their own business profile" ON public.business_profiles;

CREATE POLICY "Users can update their own business profile" 
ON public.business_profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = business_profiles.profile_id 
    AND profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = business_profiles.profile_id 
    AND profiles.user_id = auth.uid()
  )
);