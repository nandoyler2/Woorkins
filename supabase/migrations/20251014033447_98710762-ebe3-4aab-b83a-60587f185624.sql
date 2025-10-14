-- Remover colunas do Efí e adicionar colunas do Mercado Pago
ALTER TABLE payment_gateway_config 
DROP COLUMN IF EXISTS efi_enabled,
DROP COLUMN IF EXISTS efi_pix_key,
DROP COLUMN IF EXISTS efi_pix_key_type,
DROP COLUMN IF EXISTS efi_pix_certificate_path,
DROP COLUMN IF EXISTS efi_mtls_cert_path,
DROP COLUMN IF EXISTS efi_pix_discount_percent,
DROP COLUMN IF EXISTS efi_pix_expiration_hours,
DROP COLUMN IF EXISTS efi_validate_mtls,
DROP COLUMN IF EXISTS efi_card_discount_percent;

-- Adicionar colunas do Mercado Pago
ALTER TABLE payment_gateway_config
ADD COLUMN IF NOT EXISTS mercadopago_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mercadopago_pix_discount_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS mercadopago_card_discount_percent numeric DEFAULT 0;

-- Atualizar active_gateway para aceitar mercadopago
ALTER TABLE payment_gateway_config 
ALTER COLUMN active_gateway TYPE text;

-- Renomear tabela de pagamentos Efí para Mercado Pago
ALTER TABLE woorkoins_efi_payments 
RENAME TO woorkoins_mercadopago_payments;

-- Atualizar coluna charge_id para payment_id (mais genérico)
ALTER TABLE woorkoins_mercadopago_payments 
RENAME COLUMN charge_id TO payment_id;

-- Renomear coluna efi_charge_data para payment_data
ALTER TABLE woorkoins_mercadopago_payments 
RENAME COLUMN efi_charge_data TO payment_data;