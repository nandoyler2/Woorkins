-- Criar funções RPC para incrementar/decrementar curtidas atomicamente
CREATE OR REPLACE FUNCTION public.increment_story_like_count(story_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profile_stories
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = story_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_story_like_count(story_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profile_stories
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
  WHERE id = story_id;
END;
$$;