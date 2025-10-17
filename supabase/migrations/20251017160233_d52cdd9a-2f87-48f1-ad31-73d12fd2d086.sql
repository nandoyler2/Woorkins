-- Create legal_pages table for Terms of Use and Privacy Policy
CREATE TABLE IF NOT EXISTS public.legal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

-- Everyone can view legal pages
CREATE POLICY "Legal pages are viewable by everyone"
  ON public.legal_pages
  FOR SELECT
  USING (true);

-- Only admins can manage legal pages
CREATE POLICY "Admins can manage legal pages"
  ON public.legal_pages
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger to update last_updated
CREATE TRIGGER update_legal_pages_updated_at
  BEFORE UPDATE ON public.legal_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default Terms of Use
INSERT INTO public.legal_pages (slug, title, content) VALUES 
('termos-de-uso', 'Termos de Uso', '# Termos de Uso da Woorkins

**Última atualização:** ' || to_char(now(), 'DD/MM/YYYY') || '

## 1. Aceitação dos Termos

Ao acessar e usar a plataforma Woorkins, você concorda em cumprir e estar vinculado aos seguintes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá usar nossos serviços.

## 2. Descrição dos Serviços

A Woorkins é uma plataforma digital que conecta profissionais freelancers a clientes que buscam serviços especializados. Oferecemos:

- Marketplace de projetos e serviços
- Sistema de pagamento seguro com escrow
- Mensagens e negociações
- Sistema de avaliações
- Carteira digital (Woorkoins)
- Planos de assinatura com diferentes taxas

## 3. Cadastro e Conta

### 3.1 Requisitos
- Você deve ter pelo menos 18 anos de idade
- Fornecer informações verdadeiras, precisas e atualizadas
- Manter a segurança de sua senha
- Você é responsável por todas as atividades em sua conta

### 3.2 Verificação de Identidade
- Para transações financeiras, exigimos verificação de documentos
- Documentos podem incluir RG, CNH ou outros documentos oficiais
- Verificação por selfie para confirmar identidade

## 4. Uso da Plataforma

### 4.1 Conduta Permitida
- Criar projetos legítimos
- Oferecer serviços profissionais
- Comunicação respeitosa
- Cumprir prazos acordados

### 4.2 Conduta Proibida
- Fraude ou atividades ilegais
- Spam ou conteúdo inadequado
- Assédio ou discriminação
- Violação de direitos autorais
- Tentativa de contornar o sistema de pagamento
- Múltiplas contas para o mesmo usuário

## 5. Pagamentos e Taxas

### 5.1 Sistema de Pagamento
- Pagamentos são processados via Stripe, Mercado Pago ou Efí
- Sistema de escrow protege ambas as partes
- Freelancers recebem após conclusão do trabalho

### 5.2 Taxas da Plataforma
As taxas variam conforme o plano escolhido:
- **Básico (Gratuito)**: 15% por transação
- **Prata**: 10% por transação + R$ 29,90/mês
- **Ouro**: 7% por transação + R$ 49,90/mês
- **Diamante**: 5% por transação + R$ 99,90/mês

### 5.3 Woorkoins
- Moeda virtual da plataforma
- Pode ser comprada com dinheiro real
- Não é reembolsável
- Não tem valor monetário fora da plataforma

## 6. Projetos e Propostas

### 6.1 Criação de Projetos
- Clientes devem descrever claramente o escopo
- Orçamento deve ser realista
- Prazo deve ser viável

### 6.2 Propostas
- Freelancers fazem propostas para projetos
- Propostas devem ser honestas sobre capacidades
- Cliente escolhe a melhor proposta

### 6.3 Execução
- Trabalho deve ser entregue conforme acordado
- Comunicação constante é essencial
- Modificações devem ser negociadas

## 7. Disputas e Resolução

### 7.1 Mediação
- Em caso de disputa, nossa equipe pode mediar
- Ambas as partes devem fornecer evidências
- Decisão da plataforma é final

### 7.2 Reembolsos
- Reembolsos são analisados caso a caso
- Trabalho não entregue pode gerar reembolso
- Trabalho entregue conforme acordado não gera reembolso

## 8. Propriedade Intelectual

### 8.1 Conteúdo do Usuário
- Você mantém direitos sobre seu conteúdo
- Você nos concede licença para usar seu conteúdo na plataforma
- Não use conteúdo protegido por direitos autorais sem permissão

### 8.2 Conteúdo da Plataforma
- Todo conteúdo da Woorkins é protegido por direitos autorais
- Uso não autorizado é proibido

## 9. Privacidade e Dados

- Coletamos e processamos dados conforme nossa Política de Privacidade
- Seguimos a LGPD (Lei Geral de Proteção de Dados)
- Você pode solicitar seus dados ou exclusão a qualquer momento

## 10. Modificações dos Termos

- Podemos modificar estes termos a qualquer momento
- Notificaremos sobre mudanças significativas
- Uso continuado após mudanças implica aceitação

## 11. Limitação de Responsabilidade

- A Woorkins atua como intermediária
- Não garantimos qualidade dos serviços prestados
- Não somos responsáveis por perdas ou danos indiretos
- Responsabilidade limitada ao valor da transação

## 12. Rescisão

### 12.1 Por Você
- Você pode encerrar sua conta a qualquer momento
- Obrigações pendentes devem ser cumpridas

### 12.2 Por Nós
- Podemos suspender ou encerrar contas que violem estes termos
- Atividades ilegais resultam em encerramento imediato
- Podemos reter fundos em caso de violação

## 13. Lei Aplicável

Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida no foro da comarca de São Paulo, SP.

## 14. Contato

Para dúvidas sobre estes termos:
- Email: suporte@woorkins.com
- Telefone: (11) 99999-9999

---

Ao usar a Woorkins, você declara ter lido, compreendido e concordado com estes Termos de Uso.'),

('politica-de-privacidade', 'Política de Privacidade', '# Política de Privacidade da Woorkins

**Última atualização:** ' || to_char(now(), 'DD/MM/YYYY') || '

## 1. Introdução

A Woorkins ("nós", "nosso" ou "plataforma") respeita sua privacidade e está comprometida em proteger seus dados pessoais. Esta Política de Privacidade explica como coletamos, usamos, compartilhamos e protegemos suas informações em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).

## 2. Responsável pelo Tratamento de Dados

**Woorkins Tecnologia Ltda.**
- CNPJ: XX.XXX.XXX/XXXX-XX
- Endereço: [Endereço completo]
- Email: privacidade@woorkins.com
- DPO (Encarregado de Dados): dpo@woorkins.com

## 3. Dados Coletados

### 3.1 Dados Fornecidos por Você

#### Dados de Cadastro:
- Nome completo
- Email
- CPF
- Data de nascimento
- Telefone/WhatsApp
- Endereço (opcional)
- Foto de perfil (opcional)

#### Dados Profissionais (para Freelancers):
- Portfólio
- Habilidades e experiências
- Avaliações e recomendações
- Projetos realizados

#### Dados Empresariais (para Empresas):
- Razão social
- CNPJ
- Dados da empresa
- Logo e informações de contato

#### Dados de Verificação de Identidade:
- Documento de identidade (RG, CNH)
- Selfie para verificação
- Dados extraídos dos documentos (nome, CPF, data de nascimento, filiação)

#### Dados de Pagamento:
- Chave PIX
- Dados bancários (agência, conta)
- Histórico de transações
- Informações de cartão (processadas por nossos parceiros de pagamento)

### 3.2 Dados Coletados Automaticamente

#### Dados de Uso:
- Endereço IP
- Tipo e versão do navegador
- Sistema operacional
- Páginas visitadas
- Tempo de permanência
- Origem do acesso

#### Cookies e Tecnologias Similares:
- Cookies de sessão
- Cookies de preferências
- Cookies de análise
- Local Storage para funcionalidades

### 3.3 Dados de Terceiros

#### Integrações de Pagamento:
- Stripe: dados de transação e verificação
- Mercado Pago: dados de pagamento
- Efí Pay: dados bancários e PIX

#### Serviços de Verificação:
- Serviços de validação de documentos
- APIs de verificação de identidade

## 4. Finalidade do Tratamento

### 4.1 Prestação de Serviços
- Criar e gerenciar sua conta
- Processar transações financeiras
- Conectar freelancers e clientes
- Facilitar comunicação entre usuários
- Sistema de avaliações e reputação

### 4.2 Segurança e Prevenção de Fraudes
- Verificação de identidade
- Detecção de atividades suspeitas
- Prevenção de lavagem de dinheiro
- Conformidade legal

### 4.3 Melhoria dos Serviços
- Análise de uso da plataforma
- Desenvolvimento de novos recursos
- Otimização da experiência do usuário
- Pesquisas e estatísticas

### 4.4 Comunicação
- Notificações sobre transações
- Atualizações da plataforma
- Suporte ao cliente
- Marketing (com seu consentimento)

### 4.5 Conformidade Legal
- Cumprimento de obrigações legais
- Resposta a processos judiciais
- Cooperação com autoridades

## 5. Base Legal

O tratamento de seus dados está fundamentado em:

- **Execução de contrato**: para prestação dos serviços
- **Consentimento**: para marketing e cookies não essenciais
- **Legítimo interesse**: para segurança e melhorias
- **Obrigação legal**: para conformidade fiscal e regulatória

## 6. Compartilhamento de Dados

### 6.1 Compartilhamento Necessário

#### Com Outros Usuários:
- Nome e informações de perfil público
- Avaliações e comentários
- Histórico de projetos (quando relevante)

#### Com Parceiros de Pagamento:
- Stripe, Mercado Pago, Efí Pay
- Apenas dados necessários para processar transações

#### Com Prestadores de Serviços:
- Hospedagem (Supabase/AWS)
- Analytics (dados agregados)
- Serviços de email

### 6.2 Compartilhamento Legal
- Autoridades governamentais mediante ordem judicial
- Advogados em processos legais
- Órgãos reguladores quando exigido

### 6.3 Não Compartilhamos
- Não vendemos seus dados
- Não compartilhamos para publicidade de terceiros
- Não transferimos internacionalmente sem garantias adequadas

## 7. Armazenamento e Segurança

### 7.1 Localização dos Dados
- Servidores na região AWS US-East-1
- Backups seguros
- Conformidade com LGPD para transferência internacional

### 7.2 Medidas de Segurança
- Criptografia de dados sensíveis (SSL/TLS)
- Autenticação segura
- Controle de acesso por função
- Monitoramento de segurança
- Backups regulares
- Testes de segurança periódicos

### 7.3 Tempo de Retenção
- **Dados de conta ativa**: enquanto a conta existir
- **Dados de transações**: 5 anos (obrigação legal fiscal)
- **Documentos de verificação**: 5 anos
- **Logs de acesso**: 6 meses
- **Dados de marketing**: até revogação do consentimento

## 8. Seus Direitos (LGPD)

Você tem direito a:

### 8.1 Confirmação e Acesso
- Confirmar se tratamos seus dados
- Acessar seus dados

### 8.2 Correção
- Corrigir dados incompletos ou desatualizados

### 8.3 Anonimização, Bloqueio ou Eliminação
- Solicitar anonimização de dados
- Bloquear tratamento inadequado
- Excluir dados desnecessários

### 8.4 Portabilidade
- Receber seus dados em formato estruturado
- Transferir para outro fornecedor

### 8.5 Informação
- Saber com quem compartilhamos seus dados
- Conhecer as consequências de não fornecer dados

### 8.6 Revogação do Consentimento
- Retirar consentimento a qualquer momento

### 8.7 Oposição
- Opor-se ao tratamento baseado em legítimo interesse

## 9. Exercício dos Direitos

Para exercer seus direitos:
- **Email**: privacidade@woorkins.com
- **Formulário**: disponível em sua conta
- **Prazo de resposta**: até 15 dias

## 10. Cookies

### 10.1 Tipos de Cookies
- **Essenciais**: necessários para funcionamento
- **Funcionais**: melhoram experiência
- **Analytics**: analisam uso da plataforma
- **Marketing**: apenas com consentimento

### 10.2 Gerenciamento
- Você pode configurar cookies no navegador
- Cookies essenciais não podem ser desabilitados
- Desabilitar cookies pode afetar funcionalidades

## 11. Menores de Idade

- Nossos serviços são destinados a maiores de 18 anos
- Não coletamos intencionalmente dados de menores
- Se identificarmos dados de menores, excluiremos imediatamente

## 12. Transferência Internacional

- Dados podem ser processados fora do Brasil
- Garantimos nível adequado de proteção
- Utilizamos cláusulas contratuais padrão

## 13. Alterações nesta Política

- Podemos atualizar esta política periodicamente
- Notificaremos sobre mudanças significativas
- Data de atualização sempre indicada no topo

## 14. Encarregado de Dados (DPO)

Para questões sobre privacidade:
- **Email**: dpo@woorkins.com
- **Formulário de contato**: [link]

## 15. Reclamações

Você pode apresentar reclamação à:
- **ANPD** (Autoridade Nacional de Proteção de Dados)
- Website: www.gov.br/anpd

## 16. Legislação e Foro

Esta política é regida pela legislação brasileira, especialmente pela LGPD. Foro da comarca de São Paulo, SP.

---

**Última atualização:** ' || to_char(now(), 'DD/MM/YYYY') || '

Ao usar a Woorkins, você declara ter lido e compreendido esta Política de Privacidade.');
