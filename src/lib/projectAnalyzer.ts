// Sistema de análise automática de projetos baseado em palavras-chave

// Dicionário de palavras-chave por categoria
const categoryKeywords: Record<string, string[]> = {
  design: [
    "design", "logo", "logotipo", "logomarca", "banner", "flyer", "folder", "panfleto",
    "arte", "grafico", "visual", "identidade", "marca", "branding", "cartao",
    "photoshop", "illustrator", "canva", "figma", "adobe", "corel",
    "criacao", "layout", "interface", "ui", "ux", "mockup", "prototipo"
  ],
  desenvolvimento: [
    "site", "website", "app", "aplicativo", "aplicacao", "sistema", "plataforma",
    "codigo", "programacao", "desenvolvimento", "software", "web", "mobile",
    "api", "backend", "frontend", "fullstack", "android", "ios",
    "react", "vue", "angular", "node", "python", "php", "java", "javascript",
    "typescript", "html", "css", "banco", "database", "sql"
  ],
  marketing: [
    "marketing", "anuncio", "campanha", "promocao", "publicidade",
    "social", "instagram", "facebook", "tiktok", "youtube", "linkedin",
    "ads", "google", "seo", "trafego", "lead", "conversao", "analytics",
    "email", "newsletter", "midia", "digital", "growth", "estrategia"
  ],
  redacao: [
    "texto", "redacao", "artigo", "conteudo", "blog", "post", "copy",
    "copywriting", "ebook", "roteiro", "descricao", "escrita", "revisar",
    "traduzir", "correcao", "editorial", "livro", "apostila"
  ],
  traducao: [
    "traducao", "tradutor", "ingles", "espanhol", "frances", "alemao",
    "idioma", "lingua", "interpretar", "versao", "localizar"
  ],
  video: [
    "video", "edicao", "motion", "animacao", "after", "premiere", "filmagem",
    "youtube", "reels", "tiktok", "vlog", "tutorial", "producao",
    "audiovisual", "montagem", "efeitos", "corte"
  ],
  audio: [
    "audio", "podcast", "locutor", "narracao", "voz", "locucao",
    "mixagem", "masterizacao", "musica", "som", "trilha", "jingle"
  ],
  dados: [
    "dados", "data", "excel", "planilha", "analise", "dashboard",
    "power", "bi", "sql", "database", "relatorio", "estatistica",
    "grafico", "visualizacao", "bigdata", "machine", "learning"
  ],
  consultoria: [
    "consultoria", "consultoria", "assessoria", "mentoria", "coaching",
    "treinamento", "capacitacao", "orientacao", "suporte", "ajuda"
  ]
};

// Mapeamento de palavras para tags específicas
const tagKeywords: Record<string, string[]> = {
  // Tecnologias de desenvolvimento
  "react": ["react", "reactjs", "react.js"],
  "vue": ["vue", "vuejs", "vue.js"],
  "angular": ["angular"],
  "node": ["node", "nodejs", "node.js"],
  "wordpress": ["wordpress", "wp"],
  "php": ["php"],
  "python": ["python"],
  "java": ["java"],
  "javascript": ["javascript", "js"],
  "typescript": ["typescript", "ts"],
  
  // Design
  "logo": ["logo", "logotipo", "logomarca"],
  "banner": ["banner"],
  "flyer": ["flyer", "panfleto", "folder"],
  "identidade-visual": ["identidade", "branding"],
  "ui-ux": ["ui", "ux", "interface", "experiencia"],
  "photoshop": ["photoshop"],
  "illustrator": ["illustrator"],
  "figma": ["figma"],
  
  // Marketing
  "instagram": ["instagram", "insta", "ig"],
  "facebook": ["facebook", "fb"],
  "google-ads": ["google", "ads", "adwords"],
  "seo": ["seo"],
  "trafego": ["trafego", "traffic"],
  "email-marketing": ["email", "newsletter"],
  
  // Vídeo
  "edicao-video": ["edicao", "video", "montagem"],
  "animacao": ["animacao", "motion"],
  "youtube": ["youtube"],
  "reels": ["reels", "tiktok"],
  
  // Redação
  "copywriting": ["copy", "copywriting"],
  "blog": ["blog", "artigo"],
  "ebook": ["ebook", "livro"],
  "roteiro": ["roteiro"],
  
  // Dados
  "excel": ["excel", "planilha"],
  "power-bi": ["power", "bi", "powerbi"],
  "dashboard": ["dashboard"],
  "analise-dados": ["analise", "dados", "data"]
};

/**
 * Remove acentos e normaliza texto
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .trim();
}

/**
 * Tokeniza o texto em palavras únicas
 */
function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter(word => word.length > 2); // Ignora palavras muito curtas
}

/**
 * Analisa o projeto e retorna categoria e tags automaticamente
 */
export function analyzeProject(title: string, description: string): {
  category: string;
  tags: string[];
} {
  const titleTokens = tokenize(title);
  const descriptionTokens = tokenize(description);
  
  // Contadores de pontos por categoria
  const categoryScores: Record<string, number> = {};
  
  // Analisa cada categoria
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    
    for (const keyword of keywords) {
      const normalizedKeyword = normalizeText(keyword);
      
      // Palavras do título têm peso 3x
      const titleMatches = titleTokens.filter(token => 
        token.includes(normalizedKeyword) || normalizedKeyword.includes(token)
      ).length;
      score += titleMatches * 3;
      
      // Palavras da descrição têm peso 1x
      const descMatches = descriptionTokens.filter(token => 
        token.includes(normalizedKeyword) || normalizedKeyword.includes(token)
      ).length;
      score += descMatches;
    }
    
    categoryScores[category] = score;
  }
  
  // Seleciona categoria com maior pontuação
  let selectedCategory = 'geral';
  let maxScore = 0;
  
  for (const [category, score] of Object.entries(categoryScores)) {
    if (score > maxScore) {
      maxScore = score;
      selectedCategory = category;
    }
  }
  
  // Se não houver match suficiente, usa 'geral'
  if (maxScore < 2) {
    selectedCategory = 'geral';
  }
  
  // Analisa tags
  const tagScores: Record<string, number> = {};
  const allTokens = [...titleTokens, ...descriptionTokens];
  
  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    let score = 0;
    
    for (const keyword of keywords) {
      const normalizedKeyword = normalizeText(keyword);
      
      // Conta matches no título (peso 2x)
      const titleMatches = titleTokens.filter(token => 
        token.includes(normalizedKeyword) || normalizedKeyword.includes(token)
      ).length;
      score += titleMatches * 2;
      
      // Conta matches na descrição (peso 1x)
      const descMatches = descriptionTokens.filter(token => 
        token.includes(normalizedKeyword) || normalizedKeyword.includes(token)
      ).length;
      score += descMatches;
    }
    
    if (score > 0) {
      tagScores[tag] = score;
    }
  }
  
  // Seleciona top 5 tags com maior pontuação
  const selectedTags = Object.entries(tagScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag]) => tag);
  
  return {
    category: selectedCategory,
    tags: selectedTags
  };
}
