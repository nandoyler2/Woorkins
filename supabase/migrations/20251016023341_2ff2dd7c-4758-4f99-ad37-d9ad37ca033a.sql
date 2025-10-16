-- Create table for email change verification codes
CREATE TABLE IF NOT EXISTS public.email_change_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_email TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE
);

-- Add index for faster lookups
CREATE INDEX idx_email_verifications_user_id ON public.email_change_verifications(user_id);
CREATE INDEX idx_email_verifications_expires ON public.email_change_verifications(expires_at);

-- Enable RLS
ALTER TABLE public.email_change_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own verification codes
CREATE POLICY "Users can view their own email verifications"
  ON public.email_change_verifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own verification codes
CREATE POLICY "Users can create their own email verifications"
  ON public.email_change_verifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own verification codes
CREATE POLICY "Users can update their own email verifications"
  ON public.email_change_verifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to clean up expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_email_verifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.email_change_verifications
  WHERE expires_at < NOW();
END;
$$;