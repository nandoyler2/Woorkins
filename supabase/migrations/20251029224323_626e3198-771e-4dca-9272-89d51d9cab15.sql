-- Tabela de curtidas em stories
CREATE TABLE IF NOT EXISTS public.story_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.profile_stories(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  UNIQUE(story_id, profile_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_story_likes_story ON public.story_likes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_profile ON public.story_likes(profile_id);

-- Adicionar contador de curtidas na tabela stories
ALTER TABLE public.profile_stories 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- RLS Policies
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Curtidas são visíveis por todos"
  ON public.story_likes FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem curtir"
  ON public.story_likes FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem remover suas próprias curtidas"
  ON public.story_likes FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Trigger para atualizar contador de curtidas
CREATE OR REPLACE FUNCTION update_story_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profile_stories 
    SET like_count = COALESCE(like_count, 0) + 1
    WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profile_stories 
    SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
    WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER story_like_count_trigger
  AFTER INSERT OR DELETE ON public.story_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_story_like_count();

-- Tabela de stickers/elementos interativos nos stories
CREATE TABLE IF NOT EXISTS public.story_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.profile_stories(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('poll', 'question', 'emoji', 'location', 'link', 'countdown', 'quiz')),
  
  -- Posição e tamanho (% relativo ao container)
  position_x DECIMAL(5,2) NOT NULL,
  position_y DECIMAL(5,2) NOT NULL,
  width DECIMAL(5,2) DEFAULT 40,
  height DECIMAL(5,2) DEFAULT 20,
  rotation DECIMAL(5,2) DEFAULT 0,
  
  -- Conteúdo baseado no tipo
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  CONSTRAINT valid_position CHECK (
    position_x >= 0 AND position_x <= 100 AND
    position_y >= 0 AND position_y <= 100
  )
);

-- Tabela de respostas aos stickers interativos
CREATE TABLE IF NOT EXISTS public.story_sticker_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sticker_id UUID NOT NULL REFERENCES public.story_stickers(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  UNIQUE(sticker_id, profile_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_stickers_story ON public.story_stickers(story_id);
CREATE INDEX IF NOT EXISTS idx_sticker_responses_sticker ON public.story_sticker_responses(sticker_id);

-- RLS Policies para story_stickers
ALTER TABLE public.story_stickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stickers são visíveis por todos"
  ON public.story_stickers FOR SELECT
  USING (true);

CREATE POLICY "Donos de stories podem adicionar stickers"
  ON public.story_stickers FOR INSERT
  WITH CHECK (
    story_id IN (
      SELECT ps.id FROM public.profile_stories ps
      INNER JOIN public.profiles p ON ps.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Donos de stories podem deletar stickers"
  ON public.story_stickers FOR DELETE
  USING (
    story_id IN (
      SELECT ps.id FROM public.profile_stories ps
      INNER JOIN public.profiles p ON ps.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- RLS Policies para respostas
ALTER TABLE public.story_sticker_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Respostas são visíveis por todos"
  ON public.story_sticker_responses FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem responder"
  ON public.story_sticker_responses FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );