-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Banners are viewable by everyone" ON profile_banners;
DROP POLICY IF EXISTS "Users can insert banners for their own profiles" ON profile_banners;
DROP POLICY IF EXISTS "Users can update their own profile banners" ON profile_banners;
DROP POLICY IF EXISTS "Users can delete their own profile banners" ON profile_banners;

-- Política para SELECT: todos podem ver banners ativos
CREATE POLICY "Banners are viewable by everyone" 
ON profile_banners
FOR SELECT
USING (active = true);

-- Política para INSERT: usuários podem inserir banners apenas em seus próprios perfis
CREATE POLICY "Users can insert banners for their own profiles" 
ON profile_banners
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = profile_banners.target_profile_id 
    AND profiles.user_id = auth.uid()
  )
);

-- Política para UPDATE: usuários podem atualizar apenas banners de seus próprios perfis
CREATE POLICY "Users can update their own profile banners" 
ON profile_banners
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = profile_banners.target_profile_id 
    AND profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = profile_banners.target_profile_id 
    AND profiles.user_id = auth.uid()
  )
);

-- Política para DELETE: usuários podem deletar apenas banners de seus próprios perfis
CREATE POLICY "Users can delete their own profile banners" 
ON profile_banners
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = profile_banners.target_profile_id 
    AND profiles.user_id = auth.uid()
  )
);