-- Adicionar campo para resposta do FAQ público
ALTER TABLE ai_faq 
ADD COLUMN IF NOT EXISTS faq_display_response TEXT;

-- Migrar dados existentes - criar versões formais das respostas
UPDATE ai_faq SET faq_display_response = 
  'Woorkoins é a moeda virtual da plataforma Woorkins, utilizada para realizar transações com segurança. Você pode usar Woorkoins para contratar freelancers, receber pagamentos de clientes e garantir que os pagamentos sejam liberados apenas quando o trabalho for concluído. Para comprar Woorkoins, acesse a seção de Woorkoins no menu da plataforma.'
WHERE question_pattern ILIKE '%o que é woorkoins%' AND faq_display_response IS NULL;

UPDATE ai_faq SET faq_display_response = 
  'Para comprar Woorkoins, acesse a seção "Woorkoins" no menu da plataforma. Você pode escolher o pacote desejado e realizar o pagamento via Mercado Pago (Pix, cartão de crédito ou débito) ou Stripe (cartão internacional). Após a confirmação do pagamento, os Woorkoins serão creditados automaticamente na sua conta.'
WHERE question_pattern ILIKE '%como comprar woorkoins%' AND faq_display_response IS NULL;

UPDATE ai_faq SET faq_display_response = 
  'Na Woorkins você pode contratar freelancers ou oferecer serviços, criar um perfil comercial para divulgar seu negócio, publicar e gerenciar projetos, negociar valores e prazos, e utilizar Woorkoins para transações seguras. A plataforma oferece um ambiente completo para conectar profissionais e clientes.'
WHERE question_pattern ILIKE '%o que posso fazer%' AND faq_display_response IS NULL;

UPDATE ai_faq SET faq_display_response = 
  'Para criar um perfil comercial, acesse seu perfil de usuário e clique em "Criar Perfil Comercial". Preencha as informações da sua empresa, adicione descrição dos serviços, logotipo, fotos do portfólio e informações de contato. Você pode personalizar seu perfil com banners, catálogo de produtos, vídeos e muito mais.'
WHERE question_pattern ILIKE '%criar perfil%' AND faq_display_response IS NULL;

UPDATE ai_faq SET faq_display_response = 
  'Para publicar um projeto, acesse a seção "Projetos" no menu e clique em "Criar Projeto". Preencha o título, descrição detalhada do trabalho, categoria, prazo esperado e orçamento. Após publicar, freelancers interessados poderão enviar propostas para você avaliar.'
WHERE question_pattern ILIKE '%como publicar projeto%' AND faq_display_response IS NULL;

UPDATE ai_faq SET faq_display_response = 
  'Você pode enviar mensagens através da seção "Mensagens" no menu. Para iniciar uma conversa, acesse o perfil do usuário desejado ou responda a uma proposta de projeto. A plataforma possui sistema de mensagens em tempo real com suporte a anexos de arquivos e imagens.'
WHERE question_pattern ILIKE '%enviar mensag%' AND faq_display_response IS NULL;

UPDATE ai_faq SET faq_display_response = 
  'Para verificar sua identidade, acesse "Minha Conta" no menu e clique em "Verificar Identidade". Você precisará enviar fotos do seu documento de identidade (frente e verso) e uma selfie. O processo é realizado via inteligência artificial e geralmente é concluído em poucos minutos. A verificação aumenta a confiança na plataforma.'
WHERE question_pattern ILIKE '%verific%' AND faq_display_response IS NULL;

UPDATE ai_faq SET faq_display_response = 
  'Quando um pagamento é realizado por Woorkoins, o valor fica retido em segurança até que o trabalho seja concluído. Após a entrega e aprovação do cliente, os Woorkoins são liberados para o freelancer. Você pode solicitar saque dos seus Woorkoins através da seção "Financeiro", onde poderá converter para real e transferir para sua conta bancária.'
WHERE question_pattern ILIKE '%receber pagamento%' AND faq_display_response IS NULL;

UPDATE ai_faq SET faq_display_response = 
  'Se tiver problemas ou dúvidas, você pode entrar em contato com o suporte através do chat de suporte disponível no menu da plataforma. Nossa equipe está pronta para ajudar com questões técnicas, dúvidas sobre pagamentos, verificação de documentos e qualquer outra necessidade. Você também pode enviar um email para suporte@woorkins.com.'
WHERE question_pattern ILIKE '%suporte%' AND faq_display_response IS NULL;