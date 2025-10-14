-- Adicionar campo para a public key do Mercado Pago
ALTER TABLE payment_gateway_config
ADD COLUMN IF NOT EXISTS mercadopago_public_key text;