-- Correção completa da tabela business_post_comments: foreign keys, RLS policies e índices

-- 1. Remover constraints antigos se existirem
ALTER TABLE public.business_post_comments
  DROP CONSTRAINT IF EXISTS business_post_comments_profile_id_fkey CASCADE,
  DROP CONSTRAINT IF EXISTS business_post_comments_post_id_fkey CASCADE;

-- 2. Adicionar foreign keys corretas
-- profile_id deve referenciar profiles.id (autor do comentário)
ALTER TABLE public.business_post_comments
  ADD CONSTRAINT business_post_comments_profile_id_fkey
  FOREIGN KEY (profile_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- post_id deve referenciar business_posts.id (post comentado)
ALTER TABLE public.business_post_comments
  ADD CONSTRAINT business_post_comments_post_id_fkey
  FOREIGN KEY (post_id)
  REFERENCES public.business_posts(id)
  ON DELETE CASCADE;

-- 3. Verificar e recriar RLS policies para garantir consistência
DROP POLICY IF EXISTS "Everyone can view comments" ON public.business_post_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.business_post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.business_post_comments;

-- Policy de SELECT: todos podem ver comentários
CREATE POLICY "Everyone can view comments"
  ON public.business_post_comments
  FOR SELECT
  USING (true);

-- Policy de INSERT: usuários autenticados podem comentar
CREATE POLICY "Authenticated users can create comments"
  ON public.business_post_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = business_post_comments.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

-- Policy de DELETE: usuários podem deletar seus próprios comentários
CREATE POLICY "Users can delete their own comments"
  ON public.business_post_comments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = business_post_comments.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

-- 4. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_business_post_comments_post_id 
  ON public.business_post_comments(post_id);

CREATE INDEX IF NOT EXISTS idx_business_post_comments_profile_id 
  ON public.business_post_comments(profile_id);

CREATE INDEX IF NOT EXISTS idx_business_post_comments_created_at 
  ON public.business_post_comments(created_at DESC);

-- 5. Criar índice composto para queries comuns (buscar comentários de um post ordenados por data)
CREATE INDEX IF NOT EXISTS idx_business_post_comments_post_created 
  ON public.business_post_comments(post_id, created_at DESC);