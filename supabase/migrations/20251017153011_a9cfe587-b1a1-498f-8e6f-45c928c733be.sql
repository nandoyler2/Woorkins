-- Criar tabela de FAQs administráveis
CREATE TABLE public.ai_faq (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keywords text[] NOT NULL,
  question_pattern text NOT NULL,
  response text NOT NULL,
  link text,
  category text NOT NULL DEFAULT 'general',
  active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Índice para busca rápida de keywords
CREATE INDEX idx_ai_faq_keywords ON public.ai_faq USING GIN(keywords);
CREATE INDEX idx_ai_faq_active ON public.ai_faq(active) WHERE active = true;

-- RLS para ai_faq
ALTER TABLE public.ai_faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FAQs are viewable by everyone"
  ON public.ai_faq FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage FAQs"
  ON public.ai_faq FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Criar tabela de planos administráveis
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  commission_percentage numeric NOT NULL,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  recommended boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS para subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone"
  ON public.subscription_plans FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_ai_faq_updated_at
  BEFORE UPDATE ON public.ai_faq
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Inserir planos padrão
INSERT INTO public.subscription_plans (name, slug, commission_percentage, features, display_order, recommended) VALUES
('Grátis', 'free', 5.0, '[
  {"text": "Acesso completo à plataforma", "included": true},
  {"text": "Criar projetos ilimitados", "included": true},
  {"text": "Enviar propostas", "included": true},
  {"text": "Sistema de mensagens", "included": true},
  {"text": "Suporte prioritário", "included": false},
  {"text": "Badge especial no perfil", "included": false}
]'::jsonb, 1, false),
('Pro', 'pro', 3.0, '[
  {"text": "Acesso completo à plataforma", "included": true},
  {"text": "Criar projetos ilimitados", "included": true},
  {"text": "Enviar propostas", "included": true},
  {"text": "Sistema de mensagens", "included": true},
  {"text": "Suporte prioritário", "included": true},
  {"text": "Badge especial no perfil", "included": false}
]'::jsonb, 2, true),
('Premium', 'premium', 2.0, '[
  {"text": "Acesso completo à plataforma", "included": true},
  {"text": "Criar projetos ilimitados", "included": true},
  {"text": "Enviar propostas", "included": true},
  {"text": "Sistema de mensagens", "included": true},
  {"text": "Suporte prioritário", "included": true},
  {"text": "Badge especial no perfil", "included": true}
]'::jsonb, 3, false);

-- Inserir FAQs padrão
INSERT INTO public.ai_faq (keywords, question_pattern, response, link, category, priority) VALUES
(ARRAY['woorkoins', 'funciona', 'o que é'], 'Como funciona Woorkoins', 'Woorkoins é a moeda virtual da Woorkins! 💰

Com ela você pode:
✅ Contratar freelancers com segurança
✅ Receber pagamentos de clientes
✅ Pagar apenas quando o trabalho for concluído

Quer comprar Woorkoins? Acesse:
https://woorkins.com/woorkoins', 'https://woorkins.com/woorkoins', 'woorkoins', 10),

(ARRAY['comprar', 'woorkoins', 'como compro'], 'Como comprar Woorkoins', 'É super fácil comprar Woorkoins! 🎯

1. Acesse sua carteira: https://woorkins.com/woorkoins
2. Escolha o pacote que deseja
3. Pague com cartão de crédito ou Pix
4. Receba instantaneamente!

Precisa de ajuda com algo específico? 😊', 'https://woorkins.com/woorkoins', 'woorkoins', 9),

(ARRAY['quanto custa', 'preço', 'taxa', 'comissão'], 'Taxas e Preços', '💰 A Woorkins trabalha com planos flexíveis!

A taxa de serviço varia de acordo com o seu plano:
✅ Plano Grátis
✅ Plano Pro  
✅ Plano Premium

Para ver os valores atualizados das taxas e comparar os planos:
👉 https://woorkins.com/planos

💡 Quanto melhor o plano, menor a taxa!', 'https://woorkins.com/planos', 'pricing', 10),

(ARRAY['encontrar', 'projetos', 'trabalho'], 'Como encontrar projetos', 'Para encontrar projetos incríveis:

1. Acesse: https://woorkins.com/projetos
2. Use os filtros para encontrar o que você procura
3. Envie sua proposta nos projetos que te interessam!

Dica: Mantenha seu perfil completo para receber mais convites! 💪', 'https://woorkins.com/projetos', 'projects', 8),

(ARRAY['criar', 'projeto', 'novo', 'postar'], 'Como criar projeto', 'Para criar um novo projeto:

1. Acesse: https://woorkins.com/projetos/novo
2. Preencha os detalhes do seu projeto
3. Defina o orçamento
4. Publique e aguarde propostas!

Lembre-se: Quanto mais detalhado, melhores propostas você recebe! ✨', 'https://woorkins.com/projetos/novo', 'projects', 8),

(ARRAY['mensagens', 'conversas', 'chat'], 'Ver mensagens', 'Para acessar suas mensagens:

📩 Acesse: https://woorkins.com/mensagens

Lá você pode:
✅ Ver todas as suas conversas
✅ Responder propostas
✅ Negociar com clientes/freelancers', 'https://woorkins.com/mensagens', 'navigation', 7),

(ARRAY['perfil', 'conta', 'editar'], 'Minha conta', 'Para acessar sua conta:

👤 Perfil e dados: https://woorkins.com/conta
💰 Financeiro: https://woorkins.com/financeiro
📊 Painel: https://woorkins.com/painel

O que você gostaria de fazer? Posso ajudar! 😊', 'https://woorkins.com/conta', 'navigation', 7),

(ARRAY['meus', 'projetos', 'criados'], 'Meus projetos', 'Para ver seus projetos:

📁 Acesse: https://woorkins.com/meus-projetos

Lá você pode:
✅ Ver todos os projetos que você criou
✅ Acompanhar propostas recebidas
✅ Gerenciar contratações', 'https://woorkins.com/meus-projetos', 'navigation', 7),

(ARRAY['feed', 'comunidade', 'posts'], 'Feed e Comunidade', 'Para acessar o feed da comunidade:

📱 Acesse: https://woorkins.com/feed

No feed você pode:
✅ Ver posts de outros profissionais
✅ Compartilhar seus trabalhos
✅ Fazer networking', 'https://woorkins.com/feed', 'navigation', 7);