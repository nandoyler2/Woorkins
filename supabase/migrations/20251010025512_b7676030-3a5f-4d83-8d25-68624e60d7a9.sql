-- ==================================================
-- STRIPE CONNECT INTEGRATION - COMPLETE DATABASE SCHEMA
-- ==================================================

-- 1. CREATE PLATFORM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_settings
CREATE POLICY "Admins can manage platform settings"
ON public.platform_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view platform settings"
ON public.platform_settings FOR SELECT
USING (true);

-- Insert default commission values
INSERT INTO public.platform_settings (setting_key, setting_value) VALUES
('stripe_commission_free', '{"percentage": 5.0, "stripe_fee_percentage": 0.029, "stripe_fee_fixed": 0.30}'::jsonb),
('stripe_commission_pro', '{"percentage": 3.0, "stripe_fee_percentage": 0.029, "stripe_fee_fixed": 0.30}'::jsonb),
('stripe_commission_premium', '{"percentage": 2.0, "stripe_fee_percentage": 0.029, "stripe_fee_fixed": 0.30}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- 2. CREATE USER SUBSCRIPTION PLANS TABLE
CREATE TABLE IF NOT EXISTS public.user_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'premium')),
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for user_subscription_plans
ALTER TABLE public.user_subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscription_plans
CREATE POLICY "Users can view their own subscription"
ON public.user_subscription_plans FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all subscriptions"
ON public.user_subscription_plans FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for user_subscription_plans updated_at
CREATE TRIGGER update_user_subscription_plans_updated_at
BEFORE UPDATE ON public.user_subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3. CREATE STRIPE CONNECTED ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.stripe_connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_profile_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_status TEXT DEFAULT 'pending',
  onboarding_completed BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  pix_enabled BOOLEAN DEFAULT false,
  bank_account_last4 TEXT,
  payout_method TEXT,
  details_submitted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for stripe_connected_accounts
ALTER TABLE public.stripe_connected_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_connected_accounts
CREATE POLICY "Users can view own stripe account"
ON public.stripe_connected_accounts FOR SELECT
USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "System can manage stripe accounts"
ON public.stripe_connected_accounts FOR INSERT
WITH CHECK (false);

CREATE POLICY "System can update stripe accounts"
ON public.stripe_connected_accounts FOR UPDATE
USING (false);

-- Trigger for stripe_connected_accounts updated_at
CREATE TRIGGER update_stripe_connected_accounts_updated_at
BEFORE UPDATE ON public.stripe_connected_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. UPDATE PROPOSALS TABLE - Add Stripe payment fields
ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS accepted_amount NUMERIC,
ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC,
ADD COLUMN IF NOT EXISTS stripe_fee_amount NUMERIC,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC,
ADD COLUMN IF NOT EXISTS payment_captured_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMPTZ;

-- Create index for payment lookups
CREATE INDEX IF NOT EXISTS idx_proposals_payment_intent ON public.proposals(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_proposals_payment_status ON public.proposals(payment_status);

-- 5. UPDATE NEGOTIATIONS TABLE - Add Stripe payment fields
ALTER TABLE public.negotiations 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS escrow_released BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC,
ADD COLUMN IF NOT EXISTS stripe_fee_amount NUMERIC,
ADD COLUMN IF NOT EXISTS net_amount_to_business NUMERIC,
ADD COLUMN IF NOT EXISTS payment_captured_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMPTZ;

-- Create index for payment lookups
CREATE INDEX IF NOT EXISTS idx_negotiations_payment_intent ON public.negotiations(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_negotiations_payment_status ON public.negotiations(payment_status);

-- 6. UPDATE TRANSACTIONS TABLE - Add Stripe transfer/payout fields
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payout_id TEXT,
ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS gross_amount NUMERIC,
ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT;

-- Create index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_id ON public.transactions(stripe_transfer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payout_id ON public.transactions(stripe_payout_id);
CREATE INDEX IF NOT EXISTS idx_transactions_charge_id ON public.transactions(stripe_charge_id);

-- 7. CREATE FUNCTION TO GET USER PLAN
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan_type 
     FROM public.user_subscription_plans 
     WHERE user_id = _user_id 
       AND is_active = true 
     ORDER BY created_at DESC 
     LIMIT 1),
    'free'
  );
$$;

-- 8. CREATE FUNCTION TO CALCULATE PLATFORM FEES
CREATE OR REPLACE FUNCTION public.calculate_platform_fees(
  _amount NUMERIC,
  _plan_type TEXT
)
RETURNS TABLE(
  platform_fee NUMERIC,
  stripe_fee NUMERIC,
  total_fees NUMERIC,
  net_amount NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  commission_settings JSONB;
  platform_percentage NUMERIC;
  stripe_percentage NUMERIC;
  stripe_fixed NUMERIC;
  platform_fee_calc NUMERIC;
  stripe_fee_calc NUMERIC;
BEGIN
  -- Get commission settings based on plan
  SELECT setting_value INTO commission_settings
  FROM public.platform_settings
  WHERE setting_key = 'stripe_commission_' || _plan_type;
  
  -- Extract values
  platform_percentage := (commission_settings->>'percentage')::NUMERIC;
  stripe_percentage := (commission_settings->>'stripe_fee_percentage')::NUMERIC;
  stripe_fixed := (commission_settings->>'stripe_fee_fixed')::NUMERIC;
  
  -- Calculate fees
  platform_fee_calc := (_amount * platform_percentage / 100);
  stripe_fee_calc := (_amount * stripe_percentage) + stripe_fixed;
  
  RETURN QUERY SELECT 
    platform_fee_calc,
    stripe_fee_calc,
    platform_fee_calc + stripe_fee_calc,
    _amount - (platform_fee_calc + stripe_fee_calc);
END;
$$;

-- 9. CREATE FUNCTION TO CHECK IF USER HAS STRIPE ACCOUNT
CREATE OR REPLACE FUNCTION public.user_has_stripe_account(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stripe_connected_accounts sca
    JOIN public.profiles p ON p.id = sca.profile_id
    WHERE p.user_id = _user_id
      AND sca.onboarding_completed = true
      AND sca.charges_enabled = true
      AND sca.payouts_enabled = true
  );
$$;

-- 10. ADD COMMENTS FOR DOCUMENTATION
COMMENT ON TABLE public.platform_settings IS 'Stores platform-wide settings including Stripe commission rates per plan';
COMMENT ON TABLE public.user_subscription_plans IS 'Tracks user subscription plans (free, pro, premium)';
COMMENT ON TABLE public.stripe_connected_accounts IS 'Stores Stripe Connect Standard Account information for each user/business';
COMMENT ON FUNCTION public.calculate_platform_fees IS 'Calculates platform and Stripe fees based on user plan';
COMMENT ON FUNCTION public.get_user_plan IS 'Returns the active plan for a given user';
COMMENT ON FUNCTION public.user_has_stripe_account IS 'Checks if user has a fully configured Stripe account';