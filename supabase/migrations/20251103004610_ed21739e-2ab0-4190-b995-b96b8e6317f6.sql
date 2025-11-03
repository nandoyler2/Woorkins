-- Criar tabela para projetos pendentes de moderação
CREATE TABLE IF NOT EXISTS public.pending_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  categories TEXT[] NOT NULL DEFAULT '{}',
  skills TEXT[] NOT NULL DEFAULT '{}',
  budget_min NUMERIC,
  budget_max NUMERIC,
  deadline DATE,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  moderation_reason TEXT,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  blocked_reason TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campos de moderação na tabela projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS original_categories TEXT[],
ADD COLUMN IF NOT EXISTS ai_suggested_categories TEXT[];

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pending_projects_profile ON public.pending_projects(profile_id);
CREATE INDEX IF NOT EXISTS idx_pending_projects_status ON public.pending_projects(moderation_status);
CREATE INDEX IF NOT EXISTS idx_pending_projects_created ON public.pending_projects(created_at DESC);

-- RLS para pending_projects
ALTER TABLE public.pending_projects ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos
CREATE POLICY "Admins can view all pending projects"
  ON public.pending_projects FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins podem gerenciar
CREATE POLICY "Admins can manage pending projects"
  ON public.pending_projects FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Usuários podem ver seus próprios projetos pendentes
CREATE POLICY "Users can view their own pending projects"
  ON public.pending_projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = pending_projects.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Sistema pode inserir projetos pendentes
CREATE POLICY "System can insert pending projects"
  ON public.pending_projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_pending_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_pending_projects_updated_at
  BEFORE UPDATE ON public.pending_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pending_projects_updated_at();

-- Função para aprovar projeto pendente
CREATE OR REPLACE FUNCTION public.approve_pending_project(
  p_pending_project_id UUID,
  p_admin_profile_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_pending_project RECORD;
  v_new_project_id UUID;
BEGIN
  -- Buscar projeto pendente
  SELECT * INTO v_pending_project
  FROM public.pending_projects
  WHERE id = p_pending_project_id
  AND moderation_status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projeto pendente não encontrado';
  END IF;

  -- Inserir na tabela projects
  INSERT INTO public.projects (
    profile_id,
    title,
    description,
    budget_min,
    budget_max,
    deadline,
    categories,
    skills,
    moderation_status,
    original_categories,
    ai_suggested_categories
  ) VALUES (
    v_pending_project.profile_id,
    v_pending_project.title,
    v_pending_project.description,
    v_pending_project.budget_min,
    v_pending_project.budget_max,
    v_pending_project.deadline,
    v_pending_project.categories,
    v_pending_project.skills,
    'approved',
    v_pending_project.categories,
    COALESCE((v_pending_project.ai_analysis->>'suggested_categories')::text[], v_pending_project.categories)
  )
  RETURNING id INTO v_new_project_id;

  -- Atualizar status do projeto pendente
  UPDATE public.pending_projects
  SET 
    moderation_status = 'approved',
    reviewed_by = p_admin_profile_id,
    reviewed_at = now()
  WHERE id = p_pending_project_id;

  -- Criar notificação para o usuário
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    v_pending_project.profile_id,
    'project_approved',
    'Projeto aprovado!',
    'Seu projeto "' || v_pending_project.title || '" foi aprovado e está publicado.',
    '/projetos/' || v_new_project_id
  );

  RETURN v_new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para rejeitar projeto pendente
CREATE OR REPLACE FUNCTION public.reject_pending_project(
  p_pending_project_id UUID,
  p_admin_profile_id UUID,
  p_rejection_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_pending_project RECORD;
BEGIN
  -- Buscar projeto pendente
  SELECT * INTO v_pending_project
  FROM public.pending_projects
  WHERE id = p_pending_project_id
  AND moderation_status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projeto pendente não encontrado';
  END IF;

  -- Atualizar status
  UPDATE public.pending_projects
  SET 
    moderation_status = 'rejected',
    blocked_reason = p_rejection_reason,
    reviewed_by = p_admin_profile_id,
    reviewed_at = now()
  WHERE id = p_pending_project_id;

  -- Criar notificação para o usuário
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    v_pending_project.profile_id,
    'project_rejected',
    'Projeto rejeitado',
    'Seu projeto "' || v_pending_project.title || '" foi rejeitado. Motivo: ' || p_rejection_reason,
    '/meus-projetos'
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;