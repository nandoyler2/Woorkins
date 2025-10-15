-- Create moderation violations tracking table
CREATE TABLE IF NOT EXISTS public.moderation_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  violation_count integer NOT NULL DEFAULT 0,
  blocked_until timestamp with time zone,
  last_violation_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);

-- Enable RLS
ALTER TABLE public.moderation_violations ENABLE ROW LEVEL SECURITY;

-- Users can view their own violations
CREATE POLICY "Users can view their own violations"
  ON public.moderation_violations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = moderation_violations.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- System can manage violations (for edge functions)
CREATE POLICY "System can manage violations"
  ON public.moderation_violations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at
CREATE TRIGGER update_moderation_violations_updated_at
  BEFORE UPDATE ON public.moderation_violations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_moderation_violations_profile_id 
  ON public.moderation_violations(profile_id);

CREATE INDEX IF NOT EXISTS idx_moderation_violations_blocked_until 
  ON public.moderation_violations(blocked_until) 
  WHERE blocked_until IS NOT NULL;