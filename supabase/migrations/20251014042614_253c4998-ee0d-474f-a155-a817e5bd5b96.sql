-- Habilitar realtime apenas para as tabelas que ainda não estão
ALTER PUBLICATION supabase_realtime ADD TABLE woorkoins_balance;
ALTER PUBLICATION supabase_realtime ADD TABLE woorkoins_transactions;