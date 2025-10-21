-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can manage their own portfolio items" ON public.user_portfolio_items;
DROP POLICY IF EXISTS "Everyone can view active portfolio items" ON public.user_portfolio_items;

-- Criar tabela user_portfolio_items se não existir
CREATE TABLE IF NOT EXISTS public.user_portfolio_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  project_url TEXT,
  order_index INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_portfolio_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Usuários podem gerenciar seus próprios itens de portfólio
CREATE POLICY "Users can manage their own portfolio items"
ON public.user_portfolio_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_portfolio_items.profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Políticas RLS: Todos podem visualizar itens ativos
CREATE POLICY "Everyone can view active portfolio items"
ON public.user_portfolio_items
FOR SELECT
USING (active = true);

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_portfolio_items_profile_id 
ON public.user_portfolio_items(profile_id);

-- Remover trigger se existir
DROP TRIGGER IF EXISTS update_user_portfolio_items_updated_at ON public.user_portfolio_items;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_user_portfolio_items_updated_at
BEFORE UPDATE ON public.user_portfolio_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();