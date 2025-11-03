import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Categorias válidas da plataforma
const VALID_CATEGORIES = [
  'Desenvolvimento Web',
  'Desenvolvimento Mobile',
  'Design Gráfico',
  'Design UI/UX',
  'Marketing Digital',
  'Redação e Tradução',
  'Vídeo e Animação',
  'Áudio e Música',
  'Consultoria',
  'Dados e Analytics',
  'Outro'
];

// Importar lógica de moderação (replicada aqui pois não podemos importar de src/)
function validateBasicRules(title: string, description: string) {
  const NON_DIGITAL_SERVICES = [
    'pedreiro', 'pintor', 'eletricista', 'encanador', 'faxineira', 'diarista',
    'motorista', 'segurança', 'jardineiro', 'marceneiro', 'mecanico', 'soldador'
  ];
  
  const SALES_KEYWORDS = [
    'vendo', 'venda', 'compro', 'compra', 'aluguel', 'alugo', 'troco'
  ];
  
  const SPAM_KEYWORDS = [
    'trabalhe em casa', 'ganhe dinheiro', 'renda extra'
  ];

  const lowerText = `${title} ${description}`.toLowerCase();

  for (const service of NON_DIGITAL_SERVICES) {
    if (lowerText.includes(service)) {
      return { action: 'block', reason: `Serviço não permitido: ${service}` };
    }
  }

  for (const keyword of SALES_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return { action: 'block', reason: 'Venda de produtos não permitida' };
    }
  }

  for (const keyword of SPAM_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return { action: 'block', reason: 'Conteúdo identificado como spam' };
    }
  }

  return { action: 'continue' };
}

async function categorizeTitleWithAI(title: string, description: string) {
  if (!LOVABLE_API_KEY) {
    console.log('⚠️ LOVABLE_API_KEY não configurada, usando categorização básica');
    return null;
  }

  try {
    console.log('🤖 Usando IA para categorizar projeto...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um classificador de projetos freelance. Analise o título e descrição e categorize corretamente.

CATEGORIAS VÁLIDAS:
${VALID_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}

REGRAS:
- Escolha de 1 a 3 categorias mais relevantes
- Se não se encaixar em nenhuma, use "Outro"
- Sugira 3-10 tags/skills relevantes para busca
- Tags devem ser palavras-chave técnicas específicas`
          },
          {
            role: 'user',
            content: `Título: ${title}\n\nDescrição: ${description}\n\nCategorize este projeto e sugira tags.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'categorize_project',
              description: 'Categoriza o projeto e sugere tags',
              parameters: {
                type: 'object',
                properties: {
                  categories: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array de 1 a 3 categorias válidas'
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array de 3 a 10 tags/skills relevantes'
                  },
                  confidence: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'Nível de confiança na categorização'
                  }
                },
                required: ['categories', 'tags', 'confidence']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'categorize_project' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API Lovable AI:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    
    if (data.choices?.[0]?.message?.tool_calls?.[0]) {
      const result = JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
      console.log('✅ IA categorizou:', result);
      
      // Validar que as categorias retornadas são válidas
      const validatedCategories = result.categories.filter((cat: string) => 
        VALID_CATEGORIES.includes(cat)
      );
      
      if (validatedCategories.length === 0) {
        validatedCategories.push('Outro');
      }
      
      return {
        categories: validatedCategories.slice(0, 3),
        tags: result.tags.slice(0, 10),
        confidence: result.confidence,
        needsReview: result.confidence === 'low'
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Erro ao chamar IA:', error);
    return null;
  }
}

function analyzeCategories(title: string, description: string): { categories: string[]; needsReview: boolean; tags?: string[] } {
  const categoryKeywords: Record<string, string[]> = {
    'Desenvolvimento Web': ['site', 'website', 'web', 'landing page', 'wordpress', 'html', 'css', 'javascript', 'react', 'vue', 'angular', 'frontend', 'backend'],
    'Desenvolvimento Mobile': ['app', 'aplicativo', 'mobile', 'android', 'ios', 'react native', 'flutter'],
    'Design Gráfico': ['logo', 'logotipo', 'identidade visual', 'banner', 'cartão', 'flyer', 'photoshop', 'illustrator', 'design gráfico'],
    'Design UI/UX': ['ui', 'ux', 'interface', 'experiência', 'protótipo', 'wireframe', 'figma', 'sketch'],
    'Marketing Digital': ['marketing', 'redes sociais', 'instagram', 'facebook', 'ads', 'google ads', 'seo', 'tráfego', 'campanha'],
    'Redação e Tradução': ['redação', 'conteúdo', 'artigo', 'texto', 'copywriting', 'tradução', 'revisão', 'blog'],
    'Vídeo e Animação': ['vídeo', 'edição', 'animação', 'motion', 'youtube', 'after effects', 'premiere'],
    'Áudio e Música': ['áudio', 'música', 'podcast', 'edição de áudio', 'mixagem', 'masterização'],
    'Dados e Analytics': ['dados', 'analytics', 'análise', 'dashboard', 'relatório', 'bi', 'power bi', 'tableau'],
  };

  const text = `${title} ${description}`.toLowerCase();
  const detectedCategories: string[] = [];

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      detectedCategories.push(category);
    }
  }

  if (detectedCategories.length === 0) {
    return { categories: ['Outro'], needsReview: true };
  }

  return { categories: detectedCategories.slice(0, 3), needsReview: false };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Não autenticado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Buscar perfil do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      throw new Error('Perfil não encontrado');
    }

    const { title, description, budget_min, budget_max, deadline } = await req.json();

    console.log('📋 Moderando projeto:', { title: title?.substring(0, 50) });

    // Camada 1: Validação básica
    const basicCheck = validateBasicRules(title, description);
    if (basicCheck.action === 'block') {
      console.log('❌ Bloqueado na camada 1:', basicCheck.reason);
      return new Response(
        JSON.stringify({ 
          success: false, 
          action: 'blocked',
          reason: basicCheck.reason 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Camada 2: Análise de categorias (primeiro tentar com regras)
    let categoryAnalysis = analyzeCategories(title, description);
    console.log('📊 Categorias detectadas (regras):', categoryAnalysis.categories);

    // Se não conseguiu categorizar bem, usar IA
    if (categoryAnalysis.needsReview || categoryAnalysis.categories.includes('Outro')) {
      console.log('🤖 Tentando categorização com IA...');
      const aiAnalysis = await categorizeTitleWithAI(title, description);
      
      if (aiAnalysis) {
        categoryAnalysis = {
          categories: aiAnalysis.categories,
          needsReview: aiAnalysis.needsReview,
          tags: aiAnalysis.tags
        };
        console.log('✅ IA categorizou:', categoryAnalysis);
      }
    }

    // Se ainda precisa de revisão manual, inserir em pending_projects
    if (categoryAnalysis.needsReview) {
      console.log('⏳ Enviando para revisão manual');
      
      const { data: pendingProject, error: insertError } = await supabase
        .from('pending_projects')
        .insert({
          profile_id: profile.id,
          title,
          description,
          categories: categoryAnalysis.categories,
          skills: categoryAnalysis.tags || [],
          budget_min,
          budget_max,
          deadline,
          moderation_status: 'pending',
          moderation_reason: 'Categorização automática inconclusiva',
          ai_analysis: categoryAnalysis
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao inserir pending project:', insertError);
        throw insertError;
      }

      // Notificar admins
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const adminNotifications = admins.map(admin => ({
          user_id: admin.user_id,
          type: 'admin_project_review',
          title: 'Novo projeto para revisar',
          message: `Projeto "${title}" precisa de revisão manual`,
          link: '/admin/moderation?tab=projects'
        }));

        await supabase.from('notifications').insert(adminNotifications);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'pending',
          message: 'Projeto enviado para análise. Você será notificado em breve.',
          pendingProjectId: pendingProject.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aprovação automática
    console.log('✅ Aprovado automaticamente');
    
    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      .insert({
        profile_id: profile.id,
        title,
        description,
        budget_min,
        budget_max,
        deadline,
        categories: categoryAnalysis.categories,
        skills: categoryAnalysis.tags || [],
        moderation_status: 'approved',
        original_categories: categoryAnalysis.categories,
        ai_suggested_categories: categoryAnalysis.tags ? categoryAnalysis.categories : null
      })
      .select()
      .single();

    if (projectError) {
      console.error('Erro ao criar projeto:', projectError);
      throw projectError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        action: 'approved',
        projectId: newProject.id,
        categories: categoryAnalysis.categories
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na moderação:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
