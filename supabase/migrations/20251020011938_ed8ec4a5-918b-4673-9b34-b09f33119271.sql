-- Atualizar FAQs existentes com respostas formais para a página FAQ

-- Como funciona Woorkoins
UPDATE ai_faq 
SET faq_display_response = 'Woorkoins é a moeda virtual da plataforma Woorkins, utilizada para realizar transações com segurança. Você pode usar Woorkoins para contratar freelancers e garantir que os pagamentos sejam liberados apenas quando o trabalho for concluído. Para adquirir Woorkoins, acesse a seção de Woorkoins disponível no menu da plataforma.'
WHERE id = '64d3cc71-2f9e-4717-a27d-4ccb9791c11b';

-- Taxas e Preços
UPDATE ai_faq 
SET faq_display_response = 'A Woorkins oferece planos flexíveis com diferentes taxas de serviço. As taxas variam de acordo com o plano escolhido: Plano Grátis, Plano Pro e Plano Premium. Quanto melhor o plano, menor será a taxa cobrada. Para consultar os valores atualizados e comparar os benefícios de cada plano, acesse a página de planos da plataforma.'
WHERE id = '0e8a17f5-bb1a-41d7-8d5e-5616ec81f86c';

-- Como encontrar projetos
UPDATE ai_faq 
SET faq_display_response = 'Para encontrar projetos disponíveis na plataforma, acesse a seção de Projetos através do menu. Você pode utilizar os filtros disponíveis para encontrar oportunidades que correspondam ao seu perfil profissional. Após encontrar um projeto de interesse, você pode enviar sua proposta diretamente pelo sistema. Manter seu perfil completo e atualizado aumenta suas chances de receber convites diretos de clientes.'
WHERE id = '83964822-02e9-4f43-81d1-f185e56f73c4';

-- Como criar projeto
UPDATE ai_faq 
SET faq_display_response = 'Para criar um novo projeto, acesse a seção de criação de projetos através do menu da plataforma. Preencha todos os detalhes relevantes do projeto, incluindo descrição completa, requisitos técnicos e prazo esperado. Defina o orçamento disponível para o trabalho. Após publicar o projeto, freelancers interessados poderão enviar suas propostas. Projetos bem detalhados tendem a receber propostas de maior qualidade.'
WHERE id = '471b55aa-8a9a-4463-95f4-754e80b72dff';

-- Ver mensagens
UPDATE ai_faq 
SET faq_display_response = 'Para acessar suas mensagens, clique na seção de Mensagens disponível no menu da plataforma. Nesta área você pode visualizar todas as suas conversas ativas, responder a propostas de trabalho e negociar termos com clientes ou freelancers. O sistema de mensagens suporta conversas em tempo real e permite o envio de anexos quando necessário.'
WHERE id = 'ba687979-31e3-4457-9d16-4c3282c20243';

-- Minha conta
UPDATE ai_faq 
SET faq_display_response = 'Você pode gerenciar diferentes aspectos da sua conta através do menu da plataforma. A seção de Conta permite atualizar seus dados pessoais e configurações de perfil. A área Financeiro apresenta informações sobre transações, saldo e histórico de pagamentos. O Painel oferece uma visão geral das suas atividades na plataforma, incluindo projetos, propostas e mensagens recentes.'
WHERE id = 'b8cbcd6d-1b30-4ccc-b916-04729eecc1ea';

-- Meus projetos
UPDATE ai_faq 
SET faq_display_response = 'Para visualizar seus projetos, acesse a seção Meus Projetos através do menu da plataforma. Nesta área você pode acompanhar todos os projetos que criou, visualizar as propostas recebidas de freelancers interessados e gerenciar as contratações ativas. Você também pode editar informações dos projetos em andamento e acompanhar o progresso das entregas.'
WHERE id = 'c73e8a57-8bcc-48fb-bed4-95e859687749';

-- Feed e Comunidade
UPDATE ai_faq 
SET faq_display_response = 'O Feed da comunidade é uma área social da plataforma onde você pode visualizar publicações de outros profissionais, compartilhar seus trabalhos e projetos concluídos, e fazer networking com outros membros da comunidade. Esta funcionalidade permite que você aumente sua visibilidade profissional e descubra oportunidades através das conexões estabelecidas.'
WHERE id = 'ee13277b-2012-40fd-93cf-fccde61e34e9';