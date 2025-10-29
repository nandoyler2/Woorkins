-- Limpeza completa e definitiva - incluindo TODAS as tabelas relacionadas

DO $$
DECLARE
  profiles_to_delete UUID[];
  user_ids_to_delete UUID[];
BEGIN
  -- Identificar perfis e user_ids que serão deletados
  SELECT ARRAY_AGG(id), ARRAY_AGG(user_id) 
  INTO profiles_to_delete, user_ids_to_delete
  FROM public.profiles
  WHERE username NOT IN ('vinicius_prado1', 'fernando');
  
  RAISE NOTICE 'Perfis a deletar: %', profiles_to_delete;
  RAISE NOTICE 'User IDs a deletar: %', user_ids_to_delete;
  
  -- 1. Deletar histórico de status de propostas
  DELETE FROM public.proposal_status_history
  WHERE changed_by = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Histórico de propostas deletado';
  
  -- 2. Deletar contra-propostas
  DELETE FROM public.counter_proposals
  WHERE from_profile_id = ANY(profiles_to_delete)
     OR to_profile_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Contra-propostas deletadas';
  
  -- 3. Deletar pagamentos MercadoPago
  DELETE FROM public.woorkoins_mercadopago_payments
  WHERE profile_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Pagamentos MercadoPago deletados';
  
  -- 4. Deletar wallet de freelancer
  DELETE FROM public.freelancer_wallet
  WHERE profile_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Wallets deletadas';
  
  -- 5. Deletar configurações de pagamento
  DELETE FROM public.payment_settings
  WHERE profile_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Configurações de pagamento deletadas';
  
  -- 6. Deletar transações de Woorkoins
  DELETE FROM public.woorkoins_transactions
  WHERE profile_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Transações de Woorkoins deletadas';
  
  -- 7. Deletar saldos de Woorkoins
  DELETE FROM public.woorkoins_balance
  WHERE profile_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Saldos de Woorkoins deletados';
  
  -- 8. Deletar follows
  DELETE FROM public.follows
  WHERE follower_id = ANY(profiles_to_delete)
     OR following_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Follows deletados';
  
  -- 9. Deletar notificações
  DELETE FROM public.notifications
  WHERE user_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Notificações deletadas';
  
  -- 10. Deletar conversas de AI
  DELETE FROM public.ai_assistant_conversations
  WHERE profile_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Conversas AI deletadas';
  
  -- 11. Deletar admin de perfis
  DELETE FROM public.profile_admins
  WHERE profile_id = ANY(profiles_to_delete)
     OR target_profile_id = ANY(profiles_to_delete)
     OR created_by_profile_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Admins de perfil deletados';
  
  -- 12. Deletar roles de usuários
  DELETE FROM public.user_roles
  WHERE user_id = ANY(user_ids_to_delete);
  RAISE NOTICE '✓ Roles deletadas';
  
  -- 13. Deletar planos de assinatura
  DELETE FROM public.user_subscription_plans
  WHERE user_id = ANY(user_ids_to_delete);
  RAISE NOTICE '✓ Planos de assinatura deletados';
  
  -- 14. Deletar identificadores globais
  DELETE FROM public.global_identifiers
  WHERE owner_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Identificadores globais deletados';
  
  -- 15. Finalmente, deletar os perfis
  DELETE FROM public.profiles
  WHERE id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Perfis deletados';
  
  -- 16. Deletar usuários auth
  DELETE FROM auth.users
  WHERE id = ANY(user_ids_to_delete);
  RAISE NOTICE '✓ Usuários auth deletados';
  
  -- Verificação final
  DECLARE
    remaining_profiles INTEGER;
    remaining_users INTEGER;
  BEGIN
    SELECT COUNT(*) INTO remaining_profiles FROM public.profiles;
    SELECT COUNT(*) INTO remaining_users FROM auth.users;
    RAISE NOTICE '========================';
    RAISE NOTICE '✓ LIMPEZA CONCLUÍDA!';
    RAISE NOTICE '✓ Perfis restantes: %', remaining_profiles;
    RAISE NOTICE '✓ Usuários auth restantes: %', remaining_users;
    RAISE NOTICE '========================';
  END;
END $$;