-- Criar tabela de curtidas se não existir
CREATE TABLE IF NOT EXISTS public.story_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.profile_stories(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, profile_id)
);

-- Habilitar RLS
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas se existirem e criar novas
DROP POLICY IF EXISTS "Everyone can view story likes" ON public.story_likes;
CREATE POLICY "Everyone can view story likes"
ON public.story_likes
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert their own likes" ON public.story_likes;
CREATE POLICY "Users can insert their own likes"
ON public.story_likes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = story_likes.profile_id
    AND profiles.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own likes" ON public.story_likes;
CREATE POLICY "Users can delete their own likes"
ON public.story_likes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = story_likes.profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_story_likes_story_id ON public.story_likes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_profile_id ON public.story_likes(profile_id);

-- Habilitar realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'story_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.story_likes;
  END IF;
END $$;