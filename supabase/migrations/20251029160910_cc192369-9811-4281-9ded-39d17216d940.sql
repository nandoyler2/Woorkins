-- LIMPEZA TOTAL DO SISTEMA - Deletar TODOS os usuarios e dados

DO $$
BEGIN
  RAISE NOTICE 'INICIANDO LIMPEZA TOTAL DO SISTEMA';
  
  -- 1. Deletar todas as contra-propostas
  DELETE FROM public.counter_proposals;
  RAISE NOTICE 'Contra-propostas deletadas';
  
  -- 2. Deletar todos os pagamentos MercadoPago
  DELETE FROM public.woorkoins_mercadopago_payments;
  RAISE NOTICE 'Pagamentos MercadoPago deletados';
  
  -- 3. Deletar todas as wallets
  DELETE FROM public.freelancer_wallet;
  RAISE NOTICE 'Wallets deletadas';
  
  -- 4. Deletar todas as configuracoes de pagamento
  DELETE FROM public.payment_settings;
  RAISE NOTICE 'Configuracoes de pagamento deletadas';
  
  -- 5. Deletar todas as transacoes de Woorkoins
  DELETE FROM public.woorkoins_transactions;
  RAISE NOTICE 'Transacoes deletadas';
  
  -- 6. Deletar todos os saldos de Woorkoins
  DELETE FROM public.woorkoins_balance;
  RAISE NOTICE 'Saldos deletados';
  
  -- 7. Deletar todas as conversas de AI
  DELETE FROM public.ai_assistant_conversations;
  RAISE NOTICE 'Conversas AI deletadas';
  
  -- 8. Deletar todos os roles de usuario
  DELETE FROM public.user_roles;
  RAISE NOTICE 'Roles deletados';
  
  -- 9. Deletar todos os planos de assinatura
  DELETE FROM public.user_subscription_plans;
  RAISE NOTICE 'Planos de assinatura deletados';
  
  -- 10. Deletar todos os identificadores globais
  DELETE FROM public.global_identifiers;
  RAISE NOTICE 'Identificadores globais deletados';
  
  -- 11. Deletar todos os perfis
  DELETE FROM public.profiles;
  RAISE NOTICE 'Perfis deletados';
  
  -- 12. Deletar todos os usuarios auth (cascata)
  DELETE FROM auth.users;
  RAISE NOTICE 'Usuarios auth deletados';
  
  RAISE NOTICE 'SISTEMA 100 PORCENTO LIMPO';
  RAISE NOTICE 'Pronto para criar novo admin master';
END $$;