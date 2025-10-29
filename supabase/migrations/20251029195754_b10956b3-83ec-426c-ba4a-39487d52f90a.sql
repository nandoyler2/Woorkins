-- Criar tabela de stories
CREATE TABLE IF NOT EXISTS public.profile_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'text')),
  
  -- Conteúdo baseado no tipo
  media_url TEXT,
  text_content TEXT,
  background_color TEXT,
  link_url TEXT,
  text_formatting JSONB DEFAULT '{}'::jsonb,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours') NOT NULL,
  view_count INTEGER DEFAULT 0
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_stories_profile_active ON public.profile_stories(profile_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_expiration ON public.profile_stories(expires_at);

-- Tabela de visualizações
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.profile_stories(id) ON DELETE CASCADE,
  viewer_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  UNIQUE(story_id, viewer_profile_id)
);

-- Criar bucket de stories
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stories', 
  'stories', 
  true, 
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies para profile_stories
ALTER TABLE public.profile_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories ativos são visíveis por todos"
  ON public.profile_stories FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Usuários podem criar seus próprios stories"
  ON public.profile_stories FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar seus próprios stories"
  ON public.profile_stories FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies para story_views
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visualizações são visíveis por todos"
  ON public.story_views FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem registrar visualizações"
  ON public.story_views FOR INSERT
  WITH CHECK (
    viewer_profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Policies para storage bucket stories
CREATE POLICY "Stories são públicos para visualização"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stories');

CREATE POLICY "Usuários autenticados podem fazer upload de stories"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'stories' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Usuários podem deletar seus próprios stories"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'stories' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Função para limpar stories expirados
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  expired_story RECORD;
  file_path TEXT;
BEGIN
  -- Buscar stories expirados
  FOR expired_story IN 
    SELECT id, media_url 
    FROM public.profile_stories 
    WHERE expires_at <= now()
  LOOP
    -- Deletar arquivo do storage se existir
    IF expired_story.media_url IS NOT NULL THEN
      -- Extrair o caminho do arquivo
      file_path := substring(expired_story.media_url from 'stories/(.+)$');
      
      IF file_path IS NOT NULL THEN
        DELETE FROM storage.objects 
        WHERE bucket_id = 'stories' AND name = file_path;
      END IF;
    END IF;
    
    -- Deletar registro do banco (CASCADE deleta views também)
    DELETE FROM public.profile_stories WHERE id = expired_story.id;
  END LOOP;
END;
$$;