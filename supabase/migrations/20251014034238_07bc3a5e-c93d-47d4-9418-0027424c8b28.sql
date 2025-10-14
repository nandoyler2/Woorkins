-- Remover constraint antigo que impede "mercadopago"
ALTER TABLE payment_gateway_config 
DROP CONSTRAINT IF EXISTS payment_gateway_config_active_gateway_check;

-- Atualizar registros "efi" para "stripe" (já que Efí foi removido)
UPDATE payment_gateway_config 
SET active_gateway = 'stripe' 
WHERE active_gateway = 'efi';