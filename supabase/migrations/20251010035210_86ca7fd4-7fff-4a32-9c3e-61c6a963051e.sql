-- Primeiro, dropar policies que dependem de business_id
DROP POLICY IF EXISTS "Users can view their transactions" ON public.transactions;

-- Criar tabela de configurações de pagamento (PIX) para todos os usuários
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pix_key TEXT,
  pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  bank_account_holder TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id)
);

-- Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Policies para payment_settings
CREATE POLICY "Users can view their own payment settings"
ON public.payment_settings
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = payment_settings.profile_id
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own payment settings"
ON public.payment_settings
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = payment_settings.profile_id
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Users can update their own payment settings"
ON public.payment_settings
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = payment_settings.profile_id
  AND profiles.user_id = auth.uid()
));

-- Remover funções antigas que dependem de stripe_connected_accounts
DROP FUNCTION IF EXISTS public.user_has_stripe_account(uuid);
DROP FUNCTION IF EXISTS public.get_freelancer_balance(uuid);
DROP FUNCTION IF EXISTS public.get_business_balance(uuid);

-- Remover a tabela de contas Stripe conectadas (não é mais necessária)
DROP TABLE IF EXISTS public.stripe_connected_accounts CASCADE;

-- Atualizar tabela de proposals para remover referências ao Stripe do freelancer
-- e adicionar campos de carteira virtual
ALTER TABLE public.proposals
DROP COLUMN IF EXISTS stripe_fee_amount,
DROP COLUMN IF EXISTS platform_fee_amount,
ADD COLUMN IF NOT EXISTS freelancer_amount NUMERIC,
ADD COLUMN IF NOT EXISTS platform_commission NUMERIC,
ADD COLUMN IF NOT EXISTS stripe_processing_fee NUMERIC;

-- Criar tabela de carteira virtual dos freelancers
CREATE TABLE IF NOT EXISTS public.freelancer_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  available_balance NUMERIC DEFAULT 0,
  pending_balance NUMERIC DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  total_withdrawn NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id)
);

-- Enable RLS na carteira
ALTER TABLE public.freelancer_wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet"
ON public.freelancer_wallet
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = freelancer_wallet.profile_id
  AND profiles.user_id = auth.uid()
));

-- Sistema pode gerenciar carteiras
CREATE POLICY "System can manage wallets"
ON public.freelancer_wallet
FOR ALL
USING (true)
WITH CHECK (true);

-- Criar tabela de solicitações de saque
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  pix_key TEXT NOT NULL,
  pix_key_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  stripe_payout_id TEXT,
  error_message TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = withdrawal_requests.profile_id
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Users can create withdrawal requests"
ON public.withdrawal_requests
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = withdrawal_requests.profile_id
  AND profiles.user_id = auth.uid()
));

-- Sistema pode gerenciar saques
CREATE POLICY "System can manage withdrawals"
ON public.withdrawal_requests
FOR ALL
USING (true)
WITH CHECK (true);

-- Atualizar tabela de transactions
ALTER TABLE public.transactions
DROP COLUMN IF EXISTS business_id CASCADE,
ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES public.proposals(id),
ADD COLUMN IF NOT EXISTS withdrawal_id UUID REFERENCES public.withdrawal_requests(id),
ADD COLUMN IF NOT EXISTS freelancer_profile_id UUID REFERENCES public.profiles(id);

-- Recriar a policy de transactions sem business_id
CREATE POLICY "Users can view their transactions"
ON public.transactions
FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  (freelancer_profile_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = transactions.freelancer_profile_id
    AND profiles.user_id = auth.uid()
  ))
);

-- Função para calcular taxas
CREATE OR REPLACE FUNCTION public.calculate_payment_split(
  _amount NUMERIC,
  _platform_commission_percent NUMERIC DEFAULT 10
)
RETURNS TABLE(
  freelancer_amount NUMERIC,
  platform_commission NUMERIC,
  stripe_fee NUMERIC,
  total_amount NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  stripe_percentage NUMERIC := 3.99;
  stripe_fixed NUMERIC := 0.39;
  calculated_stripe_fee NUMERIC;
  calculated_platform_commission NUMERIC;
  calculated_freelancer_amount NUMERIC;
BEGIN
  -- Calcular taxa do Stripe (3.99% + R$0.39)
  calculated_stripe_fee := (_amount * stripe_percentage / 100) + stripe_fixed;
  
  -- Calcular comissão da plataforma
  calculated_platform_commission := _amount * _platform_commission_percent / 100;
  
  -- Calcular valor do freelancer (total - taxas)
  calculated_freelancer_amount := _amount - calculated_stripe_fee - calculated_platform_commission;
  
  RETURN QUERY SELECT 
    calculated_freelancer_amount,
    calculated_platform_commission,
    calculated_stripe_fee,
    _amount;
END;
$$;

-- Nova função para obter saldo do freelancer
CREATE OR REPLACE FUNCTION public.get_freelancer_wallet_balance(freelancer_profile_id uuid)
RETURNS TABLE(available numeric, pending numeric, total numeric, withdrawn numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(fw.available_balance, 0) as available,
    COALESCE(fw.pending_balance, 0) as pending,
    COALESCE(fw.total_earned, 0) as total,
    COALESCE(fw.total_withdrawn, 0) as withdrawn
  FROM freelancer_wallet fw
  WHERE fw.profile_id = freelancer_profile_id
  LIMIT 1;
  
  -- Se não existe wallet, retornar zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric, 0::numeric, 0::numeric;
  END IF;
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_payment_settings_updated_at BEFORE UPDATE ON payment_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_freelancer_wallet_updated_at BEFORE UPDATE ON freelancer_wallet
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();