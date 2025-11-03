import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function analyzeCategories(title: string, description: string) {
  const categoryKeywords: Record<string, string[]> = {
    'Desenvolvimento Web': ['site', 'website', 'web', 'landing page', 'wordpress', 'html', 'css', 'javascript', 'react', 'vue', 'angular'],
    'Design Gráfico': ['logo', 'logotipo', 'identidade visual', 'banner', 'cartão', 'flyer', 'photoshop', 'illustrator', 'design gráfico'],
    'Marketing Digital': ['marketing', 'redes sociais', 'instagram', 'facebook', 'ads', 'google ads', 'seo', 'tráfego', 'campanha'],
    'Redação e Tradução': ['redação', 'conteúdo', 'artigo', 'texto', 'copywriting', 'tradução', 'revisão', 'blog'],
    'Vídeo e Animação': ['vídeo', 'edição', 'animação', 'motion', 'youtube', 'after effects', 'premiere'],
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

    // Camada 2: Análise de categorias
    const categoryAnalysis = analyzeCategories(title, description);
    console.log('📊 Categorias detectadas:', categoryAnalysis.categories);

    // Se precisa de revisão manual, inserir em pending_projects
    if (categoryAnalysis.needsReview) {
      console.log('⏳ Enviando para revisão manual');
      
      const { data: pendingProject, error: insertError } = await supabase
        .from('pending_projects')
        .insert({
          profile_id: profile.id,
          title,
          description,
          categories: categoryAnalysis.categories,
          skills: [],
          budget_min,
          budget_max,
          deadline,
          moderation_status: 'pending',
          moderation_reason: 'Categorização automática inconclusiva',
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
        skills: [],
        moderation_status: 'approved',
        original_categories: categoryAnalysis.categories
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
