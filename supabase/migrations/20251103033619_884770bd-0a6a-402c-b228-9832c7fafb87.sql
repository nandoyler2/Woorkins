-- Adicionar política para admins poderem deletar todos os stories
CREATE POLICY "Admins can delete all stories"
ON profile_stories
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);