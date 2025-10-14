-- Criar tabela para rastrear pagamentos de Woorkoins via Efí Pay
CREATE TABLE IF NOT EXISTS public.woorkoins_efi_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  charge_id TEXT NOT NULL, -- ID da cobrança na Efí (txid para PIX)
  payment_method TEXT NOT NULL, -- 'pix' ou 'card'
  amount INTEGER NOT NULL, -- quantidade de Woorkoins
  price NUMERIC NOT NULL, -- valor em reais
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'expired', 'cancelled'
  efi_charge_data JSONB, -- dados completos da cobrança
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_woorkoins_efi_payments_profile ON public.woorkoins_efi_payments(profile_id);
CREATE INDEX idx_woorkoins_efi_payments_charge ON public.woorkoins_efi_payments(charge_id);
CREATE INDEX idx_woorkoins_efi_payments_status ON public.woorkoins_efi_payments(status);

-- RLS policies
ALTER TABLE public.woorkoins_efi_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Efí payments"
  ON public.woorkoins_efi_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = woorkoins_efi_payments.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage Efí payments"
  ON public.woorkoins_efi_payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_woorkoins_efi_payments_updated_at
  BEFORE UPDATE ON public.woorkoins_efi_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.woorkoins_efi_payments;