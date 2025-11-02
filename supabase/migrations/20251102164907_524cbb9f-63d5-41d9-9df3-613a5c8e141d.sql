-- Criar tabela para stickers de stories
CREATE TABLE IF NOT EXISTS public.story_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.profile_stories(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('poll', 'question', 'emoji', 'location', 'link')),
  position_x NUMERIC NOT NULL DEFAULT 50,
  position_y NUMERIC NOT NULL DEFAULT 50,
  width NUMERIC NOT NULL DEFAULT 40,
  height NUMERIC NOT NULL DEFAULT 20,
  rotation NUMERIC NOT NULL DEFAULT 0,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX idx_story_stickers_story_id ON public.story_stickers(story_id);
CREATE INDEX idx_story_stickers_type ON public.story_stickers(type);

-- Habilitar RLS
ALTER TABLE public.story_stickers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: todos podem ver stickers de stories públicos
CREATE POLICY "Todos podem ver stickers de stories"
ON public.story_stickers FOR SELECT
USING (true);

-- Apenas o dono do story pode inserir stickers
CREATE POLICY "Apenas dono pode inserir stickers"
ON public.story_stickers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profile_stories ps
    WHERE ps.id = story_id
    AND ps.profile_id = auth.uid()
  )
);

-- Apenas o dono do story pode deletar stickers
CREATE POLICY "Apenas dono pode deletar stickers"
ON public.story_stickers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profile_stories ps
    WHERE ps.id = story_id
    AND ps.profile_id = auth.uid()
  )
);

-- Tabela para respostas aos stickers
CREATE TABLE IF NOT EXISTS public.story_sticker_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sticker_id UUID NOT NULL REFERENCES public.story_stickers(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL,
  response_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sticker_id, profile_id)
);

-- Índices
CREATE INDEX idx_sticker_responses_sticker_id ON public.story_sticker_responses(sticker_id);
CREATE INDEX idx_sticker_responses_profile_id ON public.story_sticker_responses(profile_id);

-- Habilitar RLS
ALTER TABLE public.story_sticker_responses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: usuários podem ver suas próprias respostas
CREATE POLICY "Usuários veem próprias respostas"
ON public.story_sticker_responses FOR SELECT
USING (auth.uid() = profile_id);

-- Usuários podem inserir respostas
CREATE POLICY "Usuários podem responder stickers"
ON public.story_sticker_responses FOR INSERT
WITH CHECK (auth.uid() = profile_id);

-- Dono do story pode ver todas as respostas
CREATE POLICY "Dono do story vê todas respostas"
ON public.story_sticker_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.story_stickers ss
    JOIN public.profile_stories ps ON ps.id = ss.story_id
    WHERE ss.id = sticker_id
    AND ps.profile_id = auth.uid()
  )
);