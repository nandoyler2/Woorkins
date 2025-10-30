
-- Ativar realtime para proposal_messages
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE proposal_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Criar o registro de pagamento que faltou
INSERT INTO proposals_mercadopago_payments (
  proposal_id,
  user_id, 
  payment_id,
  amount,
  status,
  credited_at,
  payment_method
)
SELECT 
  '120f7a09-bc1b-478c-9423-80a916960fbd'::uuid,
  p_profile.user_id,
  '131181973421',
  0.35,
  'paid',
  NOW(),
  'pix'
FROM proposals p
JOIN projects pr ON pr.id = p.project_id
JOIN profiles p_profile ON p_profile.id = pr.profile_id
WHERE p.id = '120f7a09-bc1b-478c-9423-80a916960fbd'
ON CONFLICT (payment_id) DO NOTHING;

-- Atualizar status da proposta (status = accepted, work_status = in_progress)
UPDATE proposals
SET 
  payment_status = 'paid',
  status = 'accepted',
  work_status = 'in_progress',
  updated_at = NOW()
WHERE id = '120f7a09-bc1b-478c-9423-80a916960fbd'
  AND payment_status = 'pending';

-- Atualizar wallet do freelancer (adicionar ao saldo pendente)
INSERT INTO freelancer_wallet (profile_id, pending_balance, available_balance, total_earned, total_withdrawn)
SELECT 
  freelancer_id,
  GREATEST(0, freelancer_amount),
  0,
  0,
  0
FROM proposals 
WHERE id = '120f7a09-bc1b-478c-9423-80a916960fbd'
ON CONFLICT (profile_id) 
DO UPDATE SET
  pending_balance = freelancer_wallet.pending_balance + GREATEST(0, EXCLUDED.pending_balance),
  updated_at = NOW();
