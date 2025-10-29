-- Habilitar REPLICA IDENTITY FULL para capturar todos os dados nas atualizações
ALTER TABLE public.proposals REPLICA IDENTITY FULL;

-- Adicionar tabela proposals à publicação de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposals;

-- Habilitar também para counter_proposals  
ALTER TABLE public.counter_proposals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.counter_proposals;