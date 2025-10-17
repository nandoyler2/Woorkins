-- Corrigir funções sem search_path definido
CREATE OR REPLACE FUNCTION public.update_woorkoins_balance_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_typing_indicators()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM typing_indicators
  WHERE updated_at < NOW() - INTERVAL '10 seconds';
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_spam_blocks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE message_spam_tracking
  SET spam_count = 0, last_spam_at = NULL, blocked_until = NULL
  WHERE blocked_until IS NOT NULL 
  AND blocked_until < now();
END;
$function$;