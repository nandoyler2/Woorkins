-- Políticas RLS para story_comments

-- Permitir leitura de comentários para todos
CREATE POLICY "Anyone can view story comments"
ON story_comments
FOR SELECT
USING (true);

-- Permitir inserção de comentários para usuários autenticados no próprio perfil
CREATE POLICY "Users can create comments on their profile"
ON story_comments
FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM profiles WHERE id = profile_id
));