-- Create woorkoins_balance table to track user woorkoins
CREATE TABLE IF NOT EXISTS public.woorkoins_balance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);

-- Enable RLS
ALTER TABLE public.woorkoins_balance ENABLE ROW LEVEL SECURITY;

-- Users can view their own balance
CREATE POLICY "Users can view their own woorkoins balance"
ON public.woorkoins_balance
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = woorkoins_balance.profile_id
  AND profiles.user_id = auth.uid()
));

-- System can manage balances (for edge functions)
CREATE POLICY "System can manage woorkoins balances"
ON public.woorkoins_balance
FOR ALL
USING (true)
WITH CHECK (true);

-- Create woorkoins_transactions table to track purchases
CREATE TABLE IF NOT EXISTS public.woorkoins_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'spend', 'bonus')),
  description TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.woorkoins_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view their own woorkoins transactions"
ON public.woorkoins_transactions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = woorkoins_transactions.profile_id
  AND profiles.user_id = auth.uid()
));

-- System can manage transactions
CREATE POLICY "System can manage woorkoins transactions"
ON public.woorkoins_transactions
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to update balance timestamp
CREATE OR REPLACE FUNCTION update_woorkoins_balance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_woorkoins_balance_timestamp
BEFORE UPDATE ON public.woorkoins_balance
FOR EACH ROW
EXECUTE FUNCTION update_woorkoins_balance_updated_at();