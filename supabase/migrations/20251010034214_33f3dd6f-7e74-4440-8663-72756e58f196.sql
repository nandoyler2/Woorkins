-- Fix notify_new_proposal function - incorrect table alias
CREATE OR REPLACE FUNCTION public.notify_new_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT 
    p.profile_id,
    'proposal',
    'Nova proposta recebida',
    'Você recebeu uma nova proposta para: ' || p.title,
    '/my-projects'
  FROM projects p
  WHERE p.id = NEW.project_id;
  
  RETURN NEW;
END;
$function$;