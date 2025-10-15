-- Create system blocks table for admin-imposed blocks
CREATE TABLE IF NOT EXISTS public.system_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_by uuid NOT NULL REFERENCES public.profiles(id),
  block_type text NOT NULL CHECK (block_type IN ('messaging', 'system')),
  reason text NOT NULL,
  blocked_until timestamp with time zone, -- NULL means permanent
  is_permanent boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(profile_id, block_type)
);

-- Enable RLS
ALTER TABLE public.system_blocks ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks
CREATE POLICY "Users can view their own blocks"
  ON public.system_blocks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = system_blocks.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

-- Admins can manage all blocks
CREATE POLICY "Admins can manage blocks"
  ON public.system_blocks
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add trigger to update updated_at
CREATE TRIGGER update_system_blocks_updated_at
  BEFORE UPDATE ON public.system_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_blocks_profile_id 
  ON public.system_blocks(profile_id);

CREATE INDEX IF NOT EXISTS idx_system_blocks_blocked_until 
  ON public.system_blocks(blocked_until) 
  WHERE blocked_until IS NOT NULL;