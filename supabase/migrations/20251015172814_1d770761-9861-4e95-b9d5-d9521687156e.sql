-- Tabela para persistir conversas do AI Assistant
CREATE TABLE IF NOT EXISTS public.ai_assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id)
);

-- Enable RLS
ALTER TABLE public.ai_assistant_conversations ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own conversations
CREATE POLICY "Users can manage their own AI conversations"
ON public.ai_assistant_conversations
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = ai_assistant_conversations.profile_id
  AND profiles.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = ai_assistant_conversations.profile_id
  AND profiles.user_id = auth.uid()
));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ai_assistant_conversations_updated_at
BEFORE UPDATE ON public.ai_assistant_conversations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();