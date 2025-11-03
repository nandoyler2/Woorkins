-- Adicionar policy de UPDATE para negotiations
-- Permite que tanto o cliente quanto o negócio alvo possam atualizar a negociação
CREATE POLICY "Users can update their negotiations"
ON negotiations
FOR UPDATE
TO authenticated
USING (
  client_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = negotiations.target_profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Adicionar policy de UPDATE para project owners em proposals
-- Permite que donos de projetos atualizem propostas recebidas
CREATE POLICY "Project owners can update proposals"
ON proposals
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM projects
    JOIN profiles ON profiles.id = projects.profile_id
    WHERE projects.id = proposals.project_id
    AND profiles.user_id = auth.uid()
  )
);