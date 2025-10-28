-- Criar tabela para posts de usuários (similar a business_posts)
CREATE TABLE IF NOT EXISTS public.user_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_urls TEXT[],
  media_types TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_user_posts_profile_id ON public.user_posts(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_created_at ON public.user_posts(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.user_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ver posts
CREATE POLICY "Posts são visíveis para todos"
  ON public.user_posts
  FOR SELECT
  USING (true);

-- Policy: Usuários podem criar seus próprios posts
CREATE POLICY "Usuários podem criar seus posts"
  ON public.user_posts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_posts.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Policy: Usuários podem atualizar seus próprios posts
CREATE POLICY "Usuários podem atualizar seus posts"
  ON public.user_posts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_posts.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Policy: Usuários podem deletar seus próprios posts
CREATE POLICY "Usuários podem deletar seus posts"
  ON public.user_posts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_posts.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_user_posts_updated_at
  BEFORE UPDATE ON public.user_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();