-- Adicionar campo mercadopago_payment_id na tabela proposals
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;