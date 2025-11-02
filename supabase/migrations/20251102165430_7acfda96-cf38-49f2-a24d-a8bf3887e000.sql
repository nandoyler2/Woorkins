-- Criar tabela para comentários de stories
CREATE TABLE IF NOT EXISTS public.story_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.profile_stories(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_story_comments_story_id ON public.story_comments(story_id);
CREATE INDEX idx_story_comments_profile_id ON public.story_comments(profile_id);
CREATE INDEX idx_story_comments_created_at ON public.story_comments(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

-- Políticas: todos podem ver comentários de stories públicos
CREATE POLICY "Todos podem ver comentários"
ON public.story_comments FOR SELECT
USING (true);

-- Usuários autenticados podem comentar
CREATE POLICY "Usuários podem comentar"
ON public.story_comments FOR INSERT
WITH CHECK (auth.uid() = profile_id);

-- Apenas o autor pode deletar seu comentário
CREATE POLICY "Autor pode deletar comentário"
ON public.story_comments FOR DELETE
USING (auth.uid() = profile_id);

-- Dono do story pode deletar qualquer comentário
CREATE POLICY "Dono do story pode deletar comentários"
ON public.story_comments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profile_stories ps
    WHERE ps.id = story_id
    AND ps.profile_id = auth.uid()
  )
);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_comments;