// Sistema de validação de projetos (sem IA)

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Lista de palavrões e termos ofensivos em português
const badWords = [
  // Palavrões comuns
  'porra', 'caralho', 'foda', 'puta', 'merda', 'bosta', 'cacete', 'cu', 'buceta', 'viado',
  'bicha', 'arrombado', 'cuzão', 'fdp', 'desgraça', 'desgraçado', 'babaca', 'idiota',
  'imbecil', 'burro', 'estúpido', 'otário', 'trouxa', 'corno',
  // Variações com caracteres especiais
  'p0rra', 'c@ralho', 'f0da', 'p*ta', 'm3rda', 'b0sta', 'v1ado', 'arr0mbado',
  // Termos discriminatórios
  'macaco', 'preto', 'favelado', 'negro', 'gay', 'lésbica', 'traveco', 'sapatão',
  // Variações de palavrões com espaços/hífens
  'f.o.d.a', 'p-u-t-a', 'c u', 'v i a d o',
];

// Palavras-chave que indicam serviços freelance válidos
const validServiceKeywords = [
  // Design
  'design', 'logo', 'logotipo', 'marca', 'identidade visual', 'banner', 'arte', 'ilustração',
  'photoshop', 'illustrator', 'figma', 'sketch', 'ui', 'ux', 'interface', 'gráfico',
  'flyer', 'cartão de visita', 'folder', 'cardápio', 'mockup', 'branding',
  // Desenvolvimento
  'site', 'website', 'app', 'aplicativo', 'sistema', 'software', 'plataforma', 'código',
  'programação', 'desenvolvimento', 'backend', 'frontend', 'fullstack', 'api', 'banco de dados',
  'wordpress', 'react', 'vue', 'angular', 'javascript', 'python', 'php', 'node', 'mobile',
  'ecommerce', 'loja virtual', 'landing page', 'web', 'responsivo',
  // Marketing Digital
  'marketing', 'marketing digital', 'seo', 'google ads', 'facebook ads', 'instagram ads',
  'anúncio', 'campanha', 'ads', 'tráfego', 'redes sociais', 'social media', 'gestão de redes',
  'conteúdo', 'copywriting', 'email marketing', 'funil', 'conversão',
  // Redação e Conteúdo
  'texto', 'redação', 'artigo', 'blog', 'post', 'conteúdo', 'copy', 'tradução', 'revisão',
  'roteiro', 'ebook', 'newsletter', 'editorial',
  // Vídeo e Áudio
  'vídeo', 'edição de vídeo', 'motion', 'animação', '3d', 'after effects', 'premiere',
  'podcast', 'edição de áudio', 'locutor', 'locução', 'narração', 'som', 'música',
  'youtube', 'reels', 'tiktok', 'shorts',
  // Consultoria e Serviços
  'consultoria', 'mentoria', 'assessoria', 'coaching', 'treinamento', 'curso', 'aula',
  'suporte', 'ajuda', 'análise', 'auditoria', 'estratégia', 'planejamento',
  // Outros serviços profissionais
  'fotografia', 'foto', 'ensaio', 'evento', 'cobertura', 'book', 'produto',
  'virtual assistant', 'assistente virtual', 'administrativo', 'gestão',
  'excel', 'planilha', 'dados', 'relatório', 'apresentação', 'powerpoint',
];

// Palavras-chave que indicam que NÃO é serviço freelance
const invalidProjectKeywords = [
  // Vendas de produtos físicos
  'vendo', 'venda', 'compro', 'compra', 'à venda', 'preço fixo', 'produto novo', 'produto usado',
  'seminovo', 'celular', 'iphone', 'notebook', 'roupa', 'tênis', 'eletrônico',
  'entrego', 'frete grátis', 'aceito cartão', 'parcelado',
  // Spam e esquemas
  'ganhe dinheiro', 'trabalhe em casa', 'renda extra', 'sem investimento', 'multinível',
  'pirâmide', 'investimento garantido', 'lucro garantido', 'dinheiro fácil',
  'clique aqui', 'link na bio', 'whatsapp', 'chama no zap',
  // Pedidos inadequados
  'grátis', 'de graça', 'sem pagar', 'trabalho voluntário', 'não quero pagar',
  'faça de graça', 'teste grátis', 'orçamento zero',
  // Oferta de emprego CLT
  'vaga de emprego', 'contrato clt', 'carteira assinada', 'registro', 'benefícios',
];

// Padrões de links e contatos suspeitos
const suspiciousPatterns = [
  // Links
  /https?:\/\//i,
  /www\./i,
  /.com\b/i,
  /.br\b/i,
  /.net\b/i,
  // WhatsApp
  /whats/i,
  /zap\b/i,
  /wa\.me/i,
  // Telefone
  /\(\d{2}\)\s*\d{4,5}-?\d{4}/,
  /\d{2}\s*9\d{4}-?\d{4}/,
  // Email
  /@\S+\.\S+/,
  // Redes sociais
  /instagram\.com/i,
  /facebook\.com/i,
  /linkedin\.com/i,
  /twitter\.com/i,
  /tiktok\.com/i,
];

/**
 * Normaliza o texto para detecção (remove acentos, converte para minúscula, remove caracteres especiais)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, ' ') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

/**
 * Detecta palavrões e termos ofensivos no texto
 */
function detectBadWords(normalizedText: string): string[] {
  const found: string[] = [];
  
  for (const badWord of badWords) {
    const normalizedBadWord = normalizeText(badWord);
    // Verifica se a palavra está presente como palavra inteira (não parte de outra palavra)
    const regex = new RegExp(`\\b${normalizedBadWord}\\b`, 'i');
    if (regex.test(normalizedText)) {
      found.push(badWord);
    }
  }
  
  return found;
}

/**
 * Verifica se o texto contém links suspeitos ou informações de contato
 */
function containsSuspiciousLinks(text: string): boolean {
  return suspiciousPatterns.some(pattern => pattern.test(text));
}

/**
 * Calcula a porcentagem de texto em CAIXA ALTA
 */
function calculateCapsPercentage(text: string): number {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return 0;
  
  const upperCaseLetters = text.replace(/[^A-Z]/g, '');
  return (upperCaseLetters.length / letters.length) * 100;
}

/**
 * Função principal de validação do projeto
 */
export function validateProject(title: string, description: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const normalizedText = normalizeText(title + ' ' + description);
  const originalText = title + ' ' + description;
  
  // 1. Verificar comprimentos mínimos
  if (title.trim().length < 10) {
    errors.push('O título deve ter pelo menos 10 caracteres.');
  }
  
  if (description.trim().length < 30) {
    errors.push('A descrição deve ter pelo menos 30 caracteres. Explique melhor o que você precisa.');
  }
  
  // 2. Verificar palavrões e termos ofensivos
  const foundBadWords = detectBadWords(normalizedText);
  if (foundBadWords.length > 0) {
    errors.push('Conteúdo inadequado detectado. Remova termos ofensivos do título ou descrição.');
  }
  
  // 3. Verificar se é venda de produto ou conteúdo inadequado
  const hasInvalidKeywords = invalidProjectKeywords.some(keyword => 
    normalizedText.includes(normalizeText(keyword))
  );
  
  if (hasInvalidKeywords) {
    errors.push('Este projeto parece ser venda de produto ou conteúdo inadequado. Woorkins é para serviços profissionais de freelance.');
  }
  
  // 4. Verificar se parece ser um serviço freelance válido
  const hasValidServiceKeywords = validServiceKeywords.some(keyword => 
    normalizedText.includes(normalizeText(keyword))
  );
  
  if (!hasValidServiceKeywords && title.trim().length >= 10 && description.trim().length >= 30) {
    warnings.push('Descreva melhor o tipo de serviço que você precisa (ex: design, desenvolvimento, marketing, redação, vídeo).');
  }
  
  // 5. Verificar texto em CAPS excessivo (indica spam)
  const capsPercentage = calculateCapsPercentage(originalText);
  if (capsPercentage > 50) {
    warnings.push('Evite escrever em CAIXA ALTA. Deixe o texto mais natural e profissional.');
  }
  
  // 6. Verificar links suspeitos ou informações de contato
  if (containsSuspiciousLinks(originalText)) {
    errors.push('Não inclua links externos, informações de contato (WhatsApp, telefone, email) ou redes sociais no projeto. Use o chat da plataforma para comunicação.');
  }
  
  // 7. Verificar se a descrição é muito genérica
  const genericPhrases = ['preciso de ajuda', 'me ajude', 'alguém pode', 'preciso urgente'];
  const hasGenericPhrase = genericPhrases.some(phrase => 
    normalizedText.includes(normalizeText(phrase))
  );
  
  if (hasGenericPhrase && description.trim().length < 100) {
    warnings.push('Seja mais específico sobre o que você precisa. Inclua detalhes como: objetivos, requisitos, referências e entregas esperadas.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
