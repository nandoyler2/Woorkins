-- Fix function search_path for update_proposals_count
CREATE OR REPLACE FUNCTION update_proposals_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.projects
    SET proposals_count = proposals_count + 1
    WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.projects
    SET proposals_count = proposals_count - 1
    WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$;