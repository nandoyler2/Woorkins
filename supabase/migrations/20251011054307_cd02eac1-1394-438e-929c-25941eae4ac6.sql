-- Habilitar REPLICA IDENTITY FULL para capturar todas as mudanças nas mensagens
-- Isso garante que o Realtime capture os dados completos das mensagens

ALTER TABLE public.negotiation_messages REPLICA IDENTITY FULL;
ALTER TABLE public.proposal_messages REPLICA IDENTITY FULL;