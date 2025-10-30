-- Add mercadopago_transfer_id to withdrawal_requests
ALTER TABLE public.withdrawal_requests
ADD COLUMN IF NOT EXISTS mercadopago_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS error_message TEXT;