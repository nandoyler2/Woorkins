-- Criar tabela para rastrear pagamentos de propostas via Mercado Pago
CREATE TABLE IF NOT EXISTS public.proposals_mercadopago_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id TEXT NOT NULL UNIQUE,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  qr_code TEXT,
  qr_code_base64 TEXT,
  ticket_url TEXT,
  payment_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  credited_at TIMESTAMPTZ
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_proposals_mp_payments_proposal_id 
  ON public.proposals_mercadopago_payments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposals_mp_payments_user_id 
  ON public.proposals_mercadopago_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_mp_payments_payment_id 
  ON public.proposals_mercadopago_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_proposals_mp_payments_status 
  ON public.proposals_mercadopago_payments(status);

-- Habilitar RLS
ALTER TABLE public.proposals_mercadopago_payments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own proposal payments"
  ON public.proposals_mercadopago_payments
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    proposal_id IN (
      SELECT p.id FROM proposals p
      WHERE p.freelancer_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert their own proposal payments"
  ON public.proposals_mercadopago_payments
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_proposals_mercadopago_payments_updated_at
  BEFORE UPDATE ON public.proposals_mercadopago_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposals_mercadopago_payments;