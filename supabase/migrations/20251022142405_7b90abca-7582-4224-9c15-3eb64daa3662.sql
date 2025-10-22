-- Criar tabela para avaliações de perfis de usuário
CREATE TABLE IF NOT EXISTS public.user_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- quem está fazendo a avaliação
  evaluated_profile_id UUID NOT NULL, -- perfil sendo avaliado
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  evaluation_category TEXT DEFAULT 'positive' CHECK (evaluation_category IN ('positive', 'complaint')),
  media_urls TEXT[],
  media_types TEXT[],
  tags TEXT[],
  public_response TEXT,
  is_verified BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_evaluations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Avaliações de usuário são visíveis para todos"
  ON public.user_evaluations
  FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem criar avaliações"
  ON public.user_evaluations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_evaluations.user_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar suas próprias avaliações"
  ON public.user_evaluations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_evaluations.user_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Perfil avaliado pode adicionar resposta pública"
  ON public.user_evaluations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_evaluations.evaluated_profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar suas próprias avaliações"
  ON public.user_evaluations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_evaluations.user_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Criar índices para melhor performance
CREATE INDEX idx_user_evaluations_evaluated_profile ON public.user_evaluations(evaluated_profile_id);
CREATE INDEX idx_user_evaluations_user ON public.user_evaluations(user_id);
CREATE INDEX idx_user_evaluations_category ON public.user_evaluations(evaluation_category);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_evaluations_updated_at
  BEFORE UPDATE ON public.user_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();