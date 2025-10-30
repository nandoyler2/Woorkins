
-- Corrigir o cálculo da proposta (10% de comissão da plataforma)
UPDATE proposals
SET 
  platform_commission = current_proposal_amount * 0.10,
  freelancer_amount = current_proposal_amount * 0.90,
  stripe_processing_fee = 0,
  updated_at = NOW()
WHERE id = '120f7a09-bc1b-478c-9423-80a916960fbd';

-- Corrigir o saldo do freelancer (resetar e recalcular)
UPDATE freelancer_wallet
SET 
  pending_balance = 0.315,  -- 0.35 - 10% = 0.315
  updated_at = NOW()
WHERE profile_id = 'cf8099c2-993e-47fb-aeb0-dfbaccbaa911';
