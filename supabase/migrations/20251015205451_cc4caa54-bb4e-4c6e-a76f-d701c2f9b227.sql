-- Tabela para mensagens de suporte
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  reason TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Policies for support_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.support_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = support_conversations.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own conversations"
  ON public.support_conversations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = support_conversations.profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all conversations"
  ON public.support_conversations
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update conversations"
  ON public.support_conversations
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for support_messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.support_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_conversations sc
      JOIN public.profiles p ON p.id = sc.profile_id
      WHERE sc.id = support_messages.conversation_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.support_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_conversations sc
      JOIN public.profiles p ON p.id = sc.profile_id
      WHERE sc.id = support_messages.conversation_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all messages"
  ON public.support_messages
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can send messages"
  ON public.support_messages
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_support_conversations_updated_at
  BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;