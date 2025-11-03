import { validateProject } from './projectValidation';
import { analyzeProject } from './projectAnalyzer';

export interface ModerationResult {
  action: 'approve' | 'review' | 'block';
  reason: string;
  categories: string[];
  tags: string[];
  needsAI?: boolean;
}

// Palavras-chave de serviços NÃO permitidos (não são freelance digital)
const NON_DIGITAL_SERVICES = [
  'pedreiro', 'pintor', 'eletricista', 'encanador', 'faxineira', 'diarista',
  'motorista', 'segurança', 'jardineiro', 'marceneiro', 'mecanico', 'soldador',
  'cozinheira', 'babá', 'cuidador', 'carpinteiro', 'serralheiro', 'vidraceiro',
  'gesseiro', 'azulejista', 'paisagista', 'chaveiro', 'dedetizador', 'montador',
  'mudança', 'frete', 'entrega', 'delivery', 'construção', 'obra', 'reforma'
];

// Palavras-chave de vendas não permitidas
const SALES_KEYWORDS = [
  'vendo', 'venda', 'compro', 'compra', 'aluguel', 'alugo', 'troco',
  'iphone', 'samsung', 'notebook', 'computador', 'carro', 'moto',
  'apartamento', 'casa', 'terreno', 'lote', 'imovel'
];

// Palavras-chave de spam/pirâmide
const SPAM_KEYWORDS = [
  'trabalhe em casa', 'ganhe dinheiro', 'renda extra', 'seja seu próprio chefe',
  'multinível', 'marketing de rede', 'revenda', 'oportunidade única',
  'dinheiro fácil', 'sem experiência', 'ganhos garantidos'
];

/**
 * Camada 1: Validação básica (sem IA)
 * Usa as regras existentes do projectValidation.ts
 */
export function validateBasicRules(title: string, description: string): ModerationResult {
  const validation = validateProject(title, description);
  
  if (!validation.isValid) {
    return {
      action: 'block',
      reason: validation.errors.join('. '),
      categories: [],
      tags: []
    };
  }

  // Se passou na validação básica, segue para próxima camada
  return {
    action: 'review',
    reason: 'Passou na validação básica',
    categories: [],
    tags: [],
    needsAI: false
  };
}

/**
 * Camada 2: Análise de contexto (sem IA)
 * Verifica se é realmente serviço freelance digital
 */
export function analyzeProjectContext(title: string, description: string): ModerationResult {
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  const fullText = `${lowerTitle} ${lowerDesc}`;

  // Verifica serviços não-digitais
  for (const service of NON_DIGITAL_SERVICES) {
    if (fullText.includes(service)) {
      return {
        action: 'block',
        reason: `Este tipo de serviço (${service}) não é permitido na plataforma. A Woorkins é focada em serviços freelance digitais como design, programação, marketing digital, redação, etc.`,
        categories: [],
        tags: []
      };
    }
  }

  // Verifica vendas
  for (const keyword of SALES_KEYWORDS) {
    if (fullText.includes(keyword)) {
      return {
        action: 'block',
        reason: 'A plataforma não permite anúncios de venda de produtos. Por favor, publique apenas solicitações de serviços freelance.',
        categories: [],
        tags: []
      };
    }
  }

  // Verifica spam/pirâmide
  for (const keyword of SPAM_KEYWORDS) {
    if (fullText.includes(keyword)) {
      return {
        action: 'block',
        reason: 'Conteúdo identificado como spam ou esquema não permitido.',
        categories: [],
        tags: []
      };
    }
  }

  // Usa o analisador existente para detectar categorias
  const analysis = analyzeProject(title, description);

  // Se não detectou categorias válidas ou só detectou "Outro", precisa de revisão
  if (analysis.categories.length === 0 || 
      (analysis.categories.length === 1 && analysis.categories[0] === 'Outro')) {
    return {
      action: 'review',
      reason: 'Não foi possível identificar a categoria do projeto automaticamente. Precisa de revisão manual.',
      categories: analysis.categories,
      tags: analysis.tags,
      needsAI: true
    };
  }

  // Se detectou categorias válidas, aprovar automaticamente
  return {
    action: 'approve',
    reason: 'Projeto válido e categorizado automaticamente',
    categories: analysis.categories,
    tags: analysis.tags
  };
}

/**
 * Fluxo completo de moderação (executa as 3 camadas)
 */
export function moderateProject(
  title: string,
  description: string
): ModerationResult {
  // Camada 1: Validação básica
  const basicValidation = validateBasicRules(title, description);
  if (basicValidation.action === 'block') {
    return basicValidation;
  }

  // Camada 2: Análise de contexto
  const contextAnalysis = analyzeProjectContext(title, description);
  
  return contextAnalysis;
}
