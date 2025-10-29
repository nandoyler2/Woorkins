-- Limpeza abrangente final: Deletar TODAS as referências e perfis restantes

-- Identificar os perfis que serão deletados
DO $$
DECLARE
  profiles_to_delete UUID[];
BEGIN
  SELECT ARRAY_AGG(id) INTO profiles_to_delete
  FROM public.profiles
  WHERE username NOT IN ('vinicius_prado1', 'fernando');
  
  RAISE NOTICE 'Perfis que serão deletados: %', profiles_to_delete;
  
  -- 1. Deletar contra-propostas
  DELETE FROM public.counter_proposals
  WHERE from_profile_id = ANY(profiles_to_delete)
     OR to_profile_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Contra-propostas deletadas';
  
  -- 2. Deletar pagamentos MercadoPago
  DELETE FROM public.woorkoins_mercadopago_payments
  WHERE profile_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Pagamentos MercadoPago deletados';
  
  -- 3. Deletar wallet de freelancer
  DELETE FROM public.freelancer_wallet
  WHERE profile_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Wallets deletadas';
  
  -- 4. Deletar configurações de pagamento
  DELETE FROM public.payment_settings
  WHERE profile_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Configurações de pagamento deletadas';
  
  -- 5. Deletar transações de Woorkoins
  DELETE FROM public.woorkoins_transactions
  WHERE profile_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Transações de Woorkoins deletadas';
  
  -- 6. Deletar saldos de Woorkoins
  DELETE FROM public.woorkoins_balance
  WHERE profile_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Saldos de Woorkoins deletados';
  
  -- 7. Deletar identificadores globais
  DELETE FROM public.global_identifiers
  WHERE owner_id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Identificadores globais deletados';
  
  -- 8. Finalmente, deletar os perfis
  DELETE FROM public.profiles
  WHERE id = ANY(profiles_to_delete);
  RAISE NOTICE '✓ Perfis deletados';
  
  -- Verificação final
  DECLARE
    remaining_profiles INTEGER;
  BEGIN
    SELECT COUNT(*) INTO remaining_profiles FROM public.profiles;
    RAISE NOTICE '========================';
    RAISE NOTICE '✓ LIMPEZA CONCLUÍDA!';
    RAISE NOTICE '✓ Perfis restantes: %', remaining_profiles;
    RAISE NOTICE '========================';
  END;
END $$;