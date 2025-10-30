
-- Criar o registro de pagamento
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
  pr.user_id,
  '131181973421',
  0.35,
  'paid',
  NOW(),
  'pix'
FROM proposals p
JOIN projects proj ON proj.id = p.project_id
JOIN profiles pr ON pr.id = proj.profile_id
WHERE p.id = '120f7a09-bc1b-478c-9423-80a916960fbd'
ON CONFLICT (payment_id) DO NOTHING;

-- Atualizar status da proposta para accepted (não in_progress)
UPDATE proposals
SET 
  payment_status = 'paid',
  status = 'accepted',
  updated_at = NOW()
WHERE id = '120f7a09-bc1b-478c-9423-80a916960fbd';

-- Ativar realtime para proposal_messages
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE proposal_messages;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
