// Sistema de análise automática de projetos baseado em palavras-chave
// Mapeia para as categorias exatas dos filtros da página de projetos

// Dicionário de palavras-chave por categoria (categorias exatas dos filtros)
const categoryKeywords: Record<string, string[]> = {
  "Desenvolvimento Web": [
    "site", "website", "web", "ecommerce", "loja", "virtual", "wordpress", "woocommerce",
    "portal", "sistema", "web", "online", "internet", "dominio", "hospedagem", "landing",
    "page", "pagina", "hotsite", "institucional", "responsivo", "html", "css", "javascript",
    "frontend", "backend", "fullstack", "api", "rest", "react", "vue", "angular", "node",
    "php", "laravel", "django", "flask", "typescript", "nextjs", "nuxt"
  ],
  "Design Gráfico": [
    "design", "logo", "logotipo", "logomarca", "identidade", "visual", "branding", "marca",
    "banner", "flyer", "panfleto", "folder", "cartao", "visita", "arte", "grafico", "layout",
    "photoshop", "illustrator", "corel", "canva", "indesign", "figma", "mockup", "prototipo",
    "criacao", "criativo", "vetorial", "ilustracao", "tipografia", "paleta", "cores"
  ],
  "Marketing Digital": [
    "marketing", "digital", "ads", "anuncio", "campanha", "google", "facebook", "instagram",
    "tiktok", "linkedin", "seo", "otimizacao", "trafego", "lead", "conversao", "funil",
    "vendas", "email", "marketing", "newsletter", "automacao", "analytics", "metricas",
    "roi", "cpa", "cpc", "ctr", "growth", "hacking", "midia", "social", "redes", "sociais",
    "conteudo", "estrategia", "planejamento", "gestao"
  ],
  "Redação e Tradução": [
    "redacao", "texto", "copy", "copywriting", "artigo", "blog", "post", "conteudo",
    "escrita", "revisar", "revisao", "correcao", "editorial", "ebook", "livro", "apostila",
    "roteiro", "descricao", "produto", "traducao", "tradutor", "traduzir", "ingles", "espanhol",
    "frances", "alemao", "italiano", "portugues", "idioma", "lingua", "versao", "localizar",
    "interprete", "legendas", "transcricao"
  ],
  "Desenvolvimento Mobile": [
    "app", "aplicativo", "mobile", "android", "ios", "smartphone", "celular", "tablet",
    "aplicacao", "movel", "nativo", "hibrido", "react", "native", "flutter", "ionic",
    "kotlin", "swift", "java", "xamarin", "phonegap", "cordova", "firebase", "push",
    "notification", "notificacao", "mobile", "first", "responsivo"
  ],
  "Consultoria": [
    "consultoria", "consultor", "assessoria", "assessor", "mentoria", "mentor", "coaching",
    "coach", "treinamento", "capacitacao", "orientacao", "suporte", "ajuda", "apoio",
    "especialista", "especializado", "analise", "diagnostico", "parecer", "estrategia",
    "planejamento", "gestao", "processos", "melhorias", "otimizacao", "auditoria"
  ],
  "Vídeo e Animação": [
    "video", "edicao", "editor", "motion", "graphics", "animacao", "after", "effects",
    "premiere", "pro", "final", "cut", "davinci", "resolve", "filmagem", "gravacao",
    "youtube", "reels", "tiktok", "shorts", "vlog", "tutorial", "producao", "audiovisual",
    "montagem", "corte", "efeitos", "visuais", "vfx", "chroma", "key", "render",
    "exportacao", "legenda", "closed", "caption"
  ],
  "Fotografia": [
    "foto", "fotografia", "fotografo", "fotografico", "ensaio", "book", "fotográfico",
    "produto", "eventos", "casamento", "aniversario", "formatura", "retrato", "portrait",
    "studio", "estudio", "camera", "lente", "iluminacao", "flash", "tripé", "backdrop",
    "lightroom", "photoshop", "edicao", "tratamento", "revelacao", "album", "impressao"
  ],
  "Arquitetura": [
    "arquitetura", "arquitetonico", "arquiteto", "projeto", "planta", "baixa", "humanizado",
    "3d", "render", "renderizacao", "modelagem", "maquete", "eletronica", "autocad", "revit",
    "sketchup", "lumion", "vray", "construcao", "reforma", "interiores", "design", "interior",
    "decoracao", "ambientacao", "mobiliario", "layout", "espacial", "edificacao"
  ]
};

// Mapeamento de palavras para tags específicas
const tagKeywords: Record<string, string[]> = {
  // Desenvolvimento Web
  "React": ["react", "reactjs", "react.js"],
  "Vue": ["vue", "vuejs", "vue.js"],
  "Angular": ["angular"],
  "Node.js": ["node", "nodejs", "node.js"],
  "WordPress": ["wordpress", "wp"],
  "PHP": ["php"],
  "Laravel": ["laravel"],
  "Python": ["python"],
  "Django": ["django"],
  "JavaScript": ["javascript", "js"],
  "TypeScript": ["typescript", "ts"],
  "HTML": ["html", "html5"],
  "CSS": ["css", "css3", "sass", "scss"],
  "Next.js": ["next", "nextjs", "next.js"],
  "E-commerce": ["ecommerce", "loja", "virtual", "woocommerce"],
  "API": ["api", "rest", "restful"],
  "Backend": ["backend", "back-end"],
  "Frontend": ["frontend", "front-end"],
  
  // Design
  "Logo": ["logo", "logotipo", "logomarca"],
  "Banner": ["banner"],
  "Flyer": ["flyer", "panfleto", "folder"],
  "Identidade Visual": ["identidade", "branding", "marca"],
  "UI/UX": ["ui", "ux", "interface", "experiencia", "usabilidade"],
  "Photoshop": ["photoshop"],
  "Illustrator": ["illustrator"],
  "Figma": ["figma"],
  "Canva": ["canva"],
  "CorelDRAW": ["corel", "coreldraw"],
  "InDesign": ["indesign"],
  "Cartão de Visita": ["cartao", "visita"],
  
  // Marketing Digital
  "Instagram": ["instagram", "insta", "ig"],
  "Facebook": ["facebook", "fb"],
  "Google Ads": ["google", "ads", "adwords"],
  "Facebook Ads": ["facebook", "ads"],
  "SEO": ["seo", "otimizacao"],
  "Tráfego": ["trafego", "traffic"],
  "Email Marketing": ["email", "marketing", "newsletter"],
  "Social Media": ["social", "media", "redes", "sociais"],
  "Analytics": ["analytics", "metricas", "dados"],
  "Growth": ["growth", "hacking"],
  "Campanhas": ["campanha", "campanhas"],
  
  // Mobile
  "Android": ["android"],
  "iOS": ["ios", "iphone", "ipad"],
  "Flutter": ["flutter"],
  "React Native": ["react", "native"],
  "Kotlin": ["kotlin"],
  "Swift": ["swift"],
  
  // Vídeo e Animação
  "Edição de Vídeo": ["edicao", "video", "montagem"],
  "Animação": ["animacao", "motion", "graphics"],
  "After Effects": ["after", "effects"],
  "Premiere": ["premiere", "pro"],
  "Final Cut": ["final", "cut"],
  "YouTube": ["youtube"],
  "Reels": ["reels", "shorts"],
  "TikTok": ["tiktok"],
  
  // Redação e Tradução
  "Copywriting": ["copy", "copywriting"],
  "Blog": ["blog", "artigo"],
  "E-book": ["ebook", "livro"],
  "Roteiro": ["roteiro"],
  "Tradução": ["traducao", "traduzir", "tradutor"],
  "Inglês": ["ingles", "english"],
  "Espanhol": ["espanhol", "spanish"],
  "Revisão": ["revisao", "revisar", "correcao"],
  
  // Fotografia
  "Fotografia": ["fotografia", "foto", "fotografico"],
  "Ensaio Fotográfico": ["ensaio", "book"],
  "Produto": ["produto", "catalogo"],
  "Eventos": ["eventos", "casamento", "festa"],
  "Lightroom": ["lightroom"],
  
  // Arquitetura
  "AutoCAD": ["autocad", "cad"],
  "Revit": ["revit"],
  "SketchUp": ["sketchup"],
  "Render 3D": ["render", "3d", "renderizacao"],
  "Planta Baixa": ["planta", "baixa"],
  "Projeto Arquitetônico": ["projeto", "arquitetonico"],
  
  // Consultoria e Dados
  "Excel": ["excel", "planilha"],
  "Power BI": ["power", "bi", "powerbi"],
  "Dashboard": ["dashboard"],
  "Análise de Dados": ["analise", "dados", "data"],
  "Consultoria": ["consultoria", "consultor"],
  "Mentoria": ["mentoria", "mentor", "coaching"]
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
 * Analisa o projeto e retorna categorias e tags automaticamente
 */
export function analyzeProject(title: string, description: string): {
  categories: string[];
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
  
  // Seleciona até 3 categorias com maior pontuação (mínimo 2 pontos)
  const selectedCategories = Object.entries(categoryScores)
    .filter(([, score]) => score >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category);
  
  // Se não houver match suficiente, usa 'Outro'
  if (selectedCategories.length === 0) {
    selectedCategories.push('Outro');
  }
  
  // Analisa tags
  const tagScores: Record<string, number> = {};
  
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
  
  // Seleciona top 10 tags com maior pontuação
  const selectedTags = Object.entries(tagScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag]) => tag);
  
  return {
    categories: selectedCategories,
    tags: selectedTags
  };
}
