-- Criar tabela para configurações do gateway de pagamento
CREATE TABLE IF NOT EXISTS public.payment_gateway_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active_gateway text NOT NULL DEFAULT 'stripe' CHECK (active_gateway IN ('stripe', 'efi')),
  efi_enabled boolean DEFAULT false,
  efi_pix_key text,
  efi_pix_key_type text,
  efi_pix_certificate_path text,
  efi_pix_discount_percent numeric DEFAULT 0,
  efi_pix_expiration_hours integer DEFAULT 24,
  efi_validate_mtls boolean DEFAULT false,
  efi_card_discount_percent numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Permitir apenas uma linha de configuração
CREATE UNIQUE INDEX IF NOT EXISTS payment_gateway_config_single_row ON public.payment_gateway_config ((true));

-- Inserir configuração padrão (Stripe ativo)
INSERT INTO public.payment_gateway_config (active_gateway, efi_enabled)
VALUES ('stripe', false)
ON CONFLICT DO NOTHING;

-- RLS policies
ALTER TABLE public.payment_gateway_config ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar configurações
CREATE POLICY "Admins can manage payment gateway config"
  ON public.payment_gateway_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Todos podem visualizar qual gateway está ativo (necessário para frontend)
CREATE POLICY "Everyone can view active gateway"
  ON public.payment_gateway_config
  FOR SELECT
  USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_payment_gateway_config_updated_at
  BEFORE UPDATE ON public.payment_gateway_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();