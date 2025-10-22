-- Criar tabela para negociações entre usuários
CREATE TABLE IF NOT EXISTS public.user_negotiations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'paid', 'completed', 'rejected', 'cancelled')),
  final_amount NUMERIC,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_negotiations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver negociações onde participam"
  ON public.user_negotiations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.id = user_negotiations.client_profile_id OR profiles.id = user_negotiations.professional_profile_id)
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Clientes podem criar negociações"
  ON public.user_negotiations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_negotiations.client_profile_id
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Participantes podem atualizar suas negociações"
  ON public.user_negotiations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.id = user_negotiations.client_profile_id OR profiles.id = user_negotiations.professional_profile_id)
      AND profiles.user_id = auth.uid()
    )
  );

-- Criar índices
CREATE INDEX idx_user_negotiations_client ON public.user_negotiations(client_profile_id);
CREATE INDEX idx_user_negotiations_professional ON public.user_negotiations(professional_profile_id);
CREATE INDEX idx_user_negotiations_status ON public.user_negotiations(status);

-- Trigger para updated_at
CREATE TRIGGER update_user_negotiations_updated_at
  BEFORE UPDATE ON public.user_negotiations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela para mensagens de negociação entre usuários
CREATE TABLE IF NOT EXISTS public.user_negotiation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  negotiation_id UUID NOT NULL REFERENCES public.user_negotiations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'proposal', 'counter_proposal', 'acceptance', 'rejection')),
  content TEXT NOT NULL,
  amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_negotiation_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Participantes podem ver mensagens"
  ON public.user_negotiation_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_negotiations un
      JOIN profiles p ON (p.id = un.client_profile_id OR p.id = un.professional_profile_id)
      WHERE un.id = user_negotiation_messages.negotiation_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Participantes podem enviar mensagens"
  ON public.user_negotiation_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_negotiations un
      JOIN profiles p ON (p.id = un.client_profile_id OR p.id = un.professional_profile_id)
      WHERE un.id = user_negotiation_messages.negotiation_id
      AND p.user_id = auth.uid()
      AND p.id = user_negotiation_messages.sender_id
    )
  );

-- Criar índice
CREATE INDEX idx_user_negotiation_messages_negotiation ON public.user_negotiation_messages(negotiation_id);
CREATE INDEX idx_user_negotiation_messages_sender ON public.user_negotiation_messages(sender_id);