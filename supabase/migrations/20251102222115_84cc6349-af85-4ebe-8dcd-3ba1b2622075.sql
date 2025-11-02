-- Criar tabela para atividades da plataforma
CREATE TABLE IF NOT EXISTS public.platform_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  profile_avatar TEXT,
  target_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_profile_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para performance
CREATE INDEX idx_platform_activities_created_at ON public.platform_activities(created_at DESC);
CREATE INDEX idx_platform_activities_type ON public.platform_activities(activity_type);

-- RLS policies
ALTER TABLE public.platform_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activities are viewable by everyone"
  ON public.platform_activities
  FOR SELECT
  USING (true);

CREATE POLICY "System can insert activities"
  ON public.platform_activities
  FOR INSERT
  WITH CHECK (true);

-- Função para registrar atividade de novo projeto
CREATE OR REPLACE FUNCTION public.log_project_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_activities (
    activity_type,
    profile_id,
    profile_name,
    profile_avatar,
    metadata
  )
  SELECT 
    'project_published',
    p.id,
    COALESCE(p.full_name, p.username),
    p.avatar_url,
    jsonb_build_object('project_title', NEW.title, 'project_id', NEW.id)
  FROM public.profiles p
  WHERE p.id = NEW.profile_id;
  
  RETURN NEW;
END;
$$;

-- Trigger para novos projetos
DROP TRIGGER IF EXISTS trigger_log_project_activity ON public.projects;
CREATE TRIGGER trigger_log_project_activity
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.log_project_activity();

-- Função para registrar atividade de novo story
CREATE OR REPLACE FUNCTION public.log_story_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_activities (
    activity_type,
    profile_id,
    profile_name,
    profile_avatar,
    metadata
  )
  SELECT 
    'story_published',
    p.id,
    COALESCE(p.full_name, p.username),
    p.avatar_url,
    jsonb_build_object('story_id', NEW.id, 'story_type', NEW.type)
  FROM public.profiles p
  WHERE p.id = NEW.profile_id;
  
  RETURN NEW;
END;
$$;

-- Trigger para novos stories
DROP TRIGGER IF EXISTS trigger_log_story_activity ON public.profile_stories;
CREATE TRIGGER trigger_log_story_activity
  AFTER INSERT ON public.profile_stories
  FOR EACH ROW
  EXECUTE FUNCTION public.log_story_activity();

-- Função para registrar atividade de follow
CREATE OR REPLACE FUNCTION public.log_follow_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_activities (
    activity_type,
    profile_id,
    profile_name,
    profile_avatar,
    target_profile_id,
    target_profile_name,
    metadata
  )
  SELECT 
    'profile_followed',
    p1.id,
    COALESCE(p1.full_name, p1.username),
    p1.avatar_url,
    p2.id,
    COALESCE(p2.full_name, p2.username),
    jsonb_build_object('follow_id', NEW.id)
  FROM public.profiles p1
  CROSS JOIN public.profiles p2
  WHERE p1.id = NEW.follower_id AND p2.id = NEW.following_id;
  
  RETURN NEW;
END;
$$;

-- Trigger para novos follows
DROP TRIGGER IF EXISTS trigger_log_follow_activity ON public.follows;
CREATE TRIGGER trigger_log_follow_activity
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.log_follow_activity();

-- Função para registrar atividade de proposta
CREATE OR REPLACE FUNCTION public.log_proposal_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_activities (
    activity_type,
    profile_id,
    profile_name,
    profile_avatar,
    metadata
  )
  SELECT 
    'proposal_sent',
    p.id,
    COALESCE(p.full_name, p.username),
    p.avatar_url,
    jsonb_build_object(
      'proposal_id', NEW.id, 
      'amount', NEW.current_proposal_amount,
      'project_id', NEW.project_id
    )
  FROM public.profiles p
  WHERE p.id = NEW.freelancer_id;
  
  RETURN NEW;
END;
$$;

-- Trigger para novas propostas
DROP TRIGGER IF EXISTS trigger_log_proposal_activity ON public.proposals;
CREATE TRIGGER trigger_log_proposal_activity
  AFTER INSERT ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_proposal_activity();

-- Limpar atividades antigas (manter apenas últimos 7 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_activities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.platform_activities
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;