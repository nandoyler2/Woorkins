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
 * Detecta sequências repetitivas como "dfgdfgdfg" ou "aaaaaaa"
 */
function hasExcessiveRepetition(text: string): boolean {
  // Verifica se há 3+ caracteres consecutivos repetidos
  if (/(.)\1{2,}/i.test(text)) return true;
  
  // Verifica se há padrões de 2-4 caracteres repetidos 3+ vezes
  const patterns = text.match(/(.{2,4})\1{2,}/gi);
  if (patterns && patterns.length > 0) return true;
  
  return false;
}

/**
 * Verifica se o texto tem vogais suficientes (português precisa de vogais)
 */
function hasMinimumVowels(text: string): boolean {
  const vowels = text.match(/[aeiouáéíóúâêîôûãõ]/gi);
  const letters = text.match(/[a-záéíóúâêîôûãõç]/gi);
  
  if (!vowels || !letters) return false;
  
  // Pelo menos 30% do texto deve ser vogais (português tem ~45%)
  const vowelPercentage = (vowels.length / letters.length) * 100;
  return vowelPercentage >= 30;
}

/**
 * Verifica se o texto contém palavras reais comuns do português
 */
function hasRealWords(text: string): boolean {
  // Palavras comuns em português que DEVEM aparecer em projetos
  const commonWords = [
    // Artigos e preposições
    'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
    'em', 'no', 'na', 'nos', 'nas', 'para', 'com', 'por', 'sem',
    // Verbos comuns
    'preciso', 'quero', 'busco', 'necessito', 'gostaria', 'fazer', 'criar',
    'desenvolver', 'produzir', 'entregar', 'ter', 'ser', 'estar',
    // Substantivos comuns em projetos
    'projeto', 'trabalho', 'serviço', 'profissional', 'pessoa', 'empresa',
    'cliente', 'produto', 'resultado', 'entrega', 'prazo',
    // Adjetivos comuns
    'bom', 'boa', 'novo', 'nova', 'melhor', 'qualidade', 'profissional',
  ];
  
  const normalizedText = normalizeText(text);
  const words = normalizedText.split(/\s+/);
  
  // Verificar se pelo menos 20% das palavras são palavras comuns do português
  const realWordsCount = words.filter(word => 
    commonWords.some(common => word.includes(common))
  ).length;
  
  return realWordsCount >= Math.max(2, words.length * 0.2);
}

/**
 * Verifica se o texto tem diversidade de caracteres suficiente
 */
function hasCharacterDiversity(text: string): boolean {
  // Texto sem sentido geralmente usa poucos caracteres diferentes
  const normalizedText = normalizeText(text).replace(/\s/g, '');
  const uniqueChars = new Set(normalizedText.split(''));
  
  // Deve ter pelo menos 8 caracteres diferentes
  return uniqueChars.size >= 8;
}

/**
 * Detecta palavras longas sem vogais (indicam texto aleatório)
 */
function hasWordsWithoutVowels(text: string): boolean {
  const words = text.split(/\s+/);
  
  for (const word of words) {
    // Palavras com 5+ caracteres DEVEM ter vogais
    if (word.length >= 5) {
      if (!/[aeiouáéíóúâêîôûãõ]/i.test(word)) {
        return true; // Encontrou palavra suspeita
      }
    }
  }
  
  return false;
}

/**
 * Função principal de validação do projeto
 */
export function validateProject(title: string, description: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const normalizedText = normalizeText(title + ' ' + description);
  const originalText = title + ' ' + description;
  
  // 1. Verificar comprimentos mínimos e máximos
  if (title.trim().length < 10) {
    errors.push('O título deve ter pelo menos 10 caracteres.');
  }
  
  if (title.trim().length > 80) {
    errors.push('O título deve ter no máximo 80 caracteres.');
  }
  
  if (description.trim().length < 30) {
    errors.push('A descrição deve ter pelo menos 30 caracteres. Explique melhor o que você precisa.');
  }
  
  if (description.trim().length > 2000) {
    errors.push('A descrição deve ter no máximo 2.000 caracteres.');
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
  
  // 8. Verificar se o texto faz sentido (não é spam/aleatório)
  const textQualityIssues: string[] = [];

  if (hasExcessiveRepetition(normalizedText)) {
    textQualityIssues.push('repetição');
  }

  if (!hasMinimumVowels(normalizedText)) {
    textQualityIssues.push('falta de vogais');
  }

  if (!hasRealWords(normalizedText)) {
    textQualityIssues.push('sem palavras reais');
  }

  if (!hasCharacterDiversity(normalizedText)) {
    textQualityIssues.push('poucos caracteres diferentes');
  }

  if (hasWordsWithoutVowels(originalText)) {
    textQualityIssues.push('palavras sem vogais');
  }

  // Se houver 2 ou mais problemas de qualidade, é claramente texto sem sentido
  if (textQualityIssues.length >= 2) {
    errors.push('O texto parece não ter sentido ou ser aleatório. Escreva uma descrição clara e profissional do serviço que você precisa. Use frases completas em português e explique o que você precisa de forma detalhada.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
