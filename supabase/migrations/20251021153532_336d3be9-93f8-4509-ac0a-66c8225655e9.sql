-- Remover tabela se existir para recriar corretamente
DROP TABLE IF EXISTS public.user_testimonials CASCADE;

-- Criar tabela user_testimonials para perfis de usuário
CREATE TABLE public.user_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_photo_url TEXT,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_testimonials ENABLE ROW LEVEL SECURITY;

-- Política RLS: Donos podem gerenciar seus depoimentos
CREATE POLICY "Users can manage their own testimonials"
ON public.user_testimonials
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_testimonials.profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Política RLS: Todos podem ver depoimentos ativos  
CREATE POLICY "Everyone can view active testimonials"
ON public.user_testimonials
FOR SELECT
USING (active = true);

-- Criar índice
CREATE INDEX idx_user_testimonials_profile_id 
ON public.user_testimonials(profile_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_testimonials_updated_at
BEFORE UPDATE ON public.user_testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar colunas em business_testimonials se não existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'business_testimonials' 
                 AND column_name = 'client_photo_url') THEN
    ALTER TABLE public.business_testimonials ADD COLUMN client_photo_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public'
                 AND table_name = 'business_testimonials' 
                 AND column_name = 'order_index') THEN
    ALTER TABLE public.business_testimonials ADD COLUMN order_index INTEGER DEFAULT 0;
  END IF;
END $$;