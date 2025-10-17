-- Create table to store blocked messages for admin review
CREATE TABLE IF NOT EXISTS public.blocked_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_type text NOT NULL, -- 'proposal', 'negotiation', 'support'
  conversation_id uuid,
  original_content text,
  file_url text,
  file_name text,
  file_type text,
  moderation_reason text NOT NULL,
  moderation_category text, -- 'profanity', 'harassment', 'explicit_content', etc
  blocked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_messages ENABLE ROW LEVEL SECURITY;

-- Admins can view all blocked messages
CREATE POLICY "Admins can view all blocked messages"
ON public.blocked_messages
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert blocked messages
CREATE POLICY "System can insert blocked messages"
ON public.blocked_messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_blocked_messages_profile_id ON public.blocked_messages(profile_id);
CREATE INDEX idx_blocked_messages_blocked_at ON public.blocked_messages(blocked_at DESC);