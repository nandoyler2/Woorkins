-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create negotiations table
CREATE TABLE public.negotiations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  service_description TEXT,
  current_amount NUMERIC(10,2),
  final_amount NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT negotiations_status_check CHECK (status IN ('open', 'accepted', 'paid', 'completed', 'cancelled', 'rejected'))
);

-- Create negotiation messages table  
CREATE TABLE public.negotiation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  negotiation_id UUID NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  amount NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT messages_sender_type_check CHECK (sender_type IN ('user', 'business')),
  CONSTRAINT messages_type_check CHECK (message_type IN ('text', 'proposal', 'counter_proposal', 'acceptance', 'rejection'))
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  negotiation_id UUID NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  released_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT transactions_status_check CHECK (status IN ('pending', 'released', 'cancelled')),
  CONSTRAINT transactions_type_check CHECK (type IN ('payment', 'refund'))
);

-- Create withdrawals table
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  bank_details JSONB,
  CONSTRAINT withdrawals_status_check CHECK (status IN ('pending', 'processing', 'completed', 'rejected'))
);

-- Enable RLS
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for negotiations
CREATE POLICY "Users can view their own negotiations"
ON public.negotiations FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM business_profiles bp
    JOIN profiles p ON p.id = bp.profile_id
    WHERE bp.id = negotiations.business_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create negotiations"
ON public.negotiations FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users and businesses can update their negotiations"
ON public.negotiations FOR UPDATE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM business_profiles bp
    JOIN profiles p ON p.id = bp.profile_id
    WHERE bp.id = negotiations.business_id AND p.user_id = auth.uid()
  )
);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their negotiations"
ON public.negotiation_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM negotiations n
    WHERE n.id = negotiation_messages.negotiation_id
    AND (
      n.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM business_profiles bp
        JOIN profiles p ON p.id = bp.profile_id
        WHERE bp.id = n.business_id AND p.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can send messages in their negotiations"
ON public.negotiation_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM negotiations n
    WHERE n.id = negotiation_messages.negotiation_id
    AND (
      (n.user_id = auth.uid() AND sender_type = 'user')
      OR EXISTS (
        SELECT 1 FROM business_profiles bp
        JOIN profiles p ON p.id = bp.profile_id
        WHERE bp.id = n.business_id AND p.user_id = auth.uid() AND sender_type = 'business'
      )
    )
  )
);

-- RLS Policies for transactions
CREATE POLICY "Users can view their transactions"
ON public.transactions FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM business_profiles bp
    JOIN profiles p ON p.id = bp.profile_id
    WHERE bp.id = transactions.business_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage transactions"
ON public.transactions FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for withdrawals
CREATE POLICY "Businesses can view their withdrawals"
ON public.withdrawals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM business_profiles bp
    JOIN profiles p ON p.id = bp.profile_id
    WHERE bp.id = withdrawals.business_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Businesses can request withdrawals"
ON public.withdrawals FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM business_profiles bp
    JOIN profiles p ON p.id = bp.profile_id
    WHERE bp.id = withdrawals.business_id AND p.user_id = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_negotiations_updated_at
BEFORE UPDATE ON public.negotiations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_negotiations_business ON public.negotiations(business_id);
CREATE INDEX idx_negotiations_user ON public.negotiations(user_id);
CREATE INDEX idx_negotiations_status ON public.negotiations(status);
CREATE INDEX idx_messages_negotiation ON public.negotiation_messages(negotiation_id);
CREATE INDEX idx_transactions_negotiation ON public.transactions(negotiation_id);
CREATE INDEX idx_transactions_business ON public.transactions(business_id);
CREATE INDEX idx_withdrawals_business ON public.withdrawals(business_id);

-- Function to calculate business balance
CREATE OR REPLACE FUNCTION public.get_business_balance(business_uuid UUID)
RETURNS TABLE(available NUMERIC, pending NUMERIC, total NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END), 0) as available,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending,
    COALESCE(SUM(amount), 0) as total
  FROM transactions
  WHERE business_id = business_uuid AND type = 'payment';
END;
$$;