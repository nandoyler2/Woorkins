-- Habilitar realtime para a tabela de atividades
ALTER TABLE public.platform_activities REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_activities;