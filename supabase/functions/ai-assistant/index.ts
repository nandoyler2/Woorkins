import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper para buscar dados do usuário
async function getUserContext(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!profile) return null;

  // Buscar bloqueios manuais do sistema
  const { data: blocks } = await supabase
    .from('system_blocks')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Buscar violações de moderação automática
  const { data: violations } = await supabase
    .from('moderation_violations')
    .select('*')
    .eq('profile_id', profile.id)
    .maybeSingle();

  // Verificar se está bloqueado por violações de moderação
  const now = new Date();
  const hasActiveViolationBlock = violations?.blocked_until && new Date(violations.blocked_until) > now;

  const { data: balance } = await supabase
    .from('woorkoins_balance')
    .select('*')
    .eq('profile_id', profile.id)
    .maybeSingle();

  const { data: transactions } = await supabase
    .from('woorkoins_transactions')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: recentMessages } = await supabase
    .from('negotiation_messages')
    .select('*, negotiations(*)')
    .eq('sender_id', profile.id)
    .eq('moderation_status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    profile,
    blocks: blocks || [],
    violations,
    hasActiveViolationBlock,
    balance,
    transactions: transactions || [],
    recentMessages: recentMessages || []
  };
}

// Helper para executar ações administrativas
async function executeAdminAction(supabase: any, action: string, params: any) {
  console.log('Executing admin action:', action, params);
  
  switch (action) {
    case 'unblock_user':
      // Remover bloqueios manuais
      await supabase
        .from('system_blocks')
        .delete()
        .eq('profile_id', params.profileId);
      
      // Resetar violações de moderação automática
      await supabase
        .from('moderation_violations')
        .update({ 
          violation_count: 0, 
          blocked_until: null,
          last_violation_at: null
        })
        .eq('profile_id', params.profileId);
      
      return { success: true, message: 'Você foi desbloqueado! ⚠️ ATENÇÃO: Se repetir o mesmo tipo de violação, não poderá mais desbloquear pelo chat e terá que aguardar o prazo completo do bloqueio.' };

    case 'add_woorkoins':
      const { data: currentBalance } = await supabase
        .from('woorkoins_balance')
        .select('balance')
        .eq('profile_id', params.profileId)
        .maybeSingle();

      await supabase
        .from('woorkoins_balance')
        .update({ balance: (currentBalance?.balance || 0) + params.amount })
        .eq('profile_id', params.profileId);

      await supabase
        .from('woorkoins_transactions')
        .insert({
          profile_id: params.profileId,
          type: 'admin_adjustment',
          amount: params.amount,
          description: params.reason || 'Ajuste administrativo via AI'
        });

      return { success: true, message: `${params.amount} woorkoins adicionados` };

    case 'reset_violations':
      await supabase
        .from('moderation_violations')
        .update({ violation_count: 0, blocked_until: null, last_violation_at: null })
        .eq('profile_id', params.profileId);
      return { success: true, message: 'Violações resetadas' };

    default:
      return { success: false, message: 'Ação não reconhecida' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurado');
    }

    // Criar cliente Supabase com service role para acesso admin
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Obter usuário autenticado
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Buscar contexto do usuário
    const userContext = await getUserContext(supabase, user.id);

    if (!userContext) {
      throw new Error('Perfil não encontrado');
    }

    // Construir contexto para a IA
    const firstName = userContext.profile.full_name?.split(' ')[0] || 'usuário';
    
    const contextInfo = `
CONTEXTO DO USUÁRIO:
- Nome: ${firstName}
- Saldo Woorkoins: ${userContext.balance?.balance || 0}

🚨 BLOQUEIOS ATIVOS:

BLOQUEIOS MANUAIS DO SISTEMA: ${userContext.blocks.length > 0 ? 'SIM' : 'NÃO'}
${userContext.blocks.map((b: any) => `
  - Tipo: ${b.block_type}
  - Motivo: ${b.reason}
  - Permanente: ${b.is_permanent ? 'Sim' : 'Não'}
  - Expira em: ${b.blocked_until || 'N/A'}
`).join('\n')}

BLOQUEIO POR MODERAÇÃO AUTOMÁTICA: ${userContext.hasActiveViolationBlock ? 'SIM ⚠️' : 'NÃO'}
${userContext.hasActiveViolationBlock ? `
  - Total de violações: ${userContext.violations?.violation_count || 0}
  - Bloqueado até: ${userContext.violations?.blocked_until || 'N/A'}
  - Última violação: ${userContext.violations?.last_violation_at || 'Nunca'}
` : ''}

VIOLAÇÕES DE MODERAÇÃO (histórico):
- Total acumulado: ${userContext.violations?.violation_count || 0}
- Última violação: ${userContext.violations?.last_violation_at || 'Nunca'}

MENSAGENS BLOQUEADAS RECENTEMENTE: ${userContext.recentMessages.length}
${userContext.recentMessages.slice(0, 3).map((m: any) => `
  - Data: ${new Date(m.created_at).toLocaleString('pt-BR')}
  - Motivo: ${m.moderation_reason}
  - Conteúdo: ${m.content?.substring(0, 100)}...
`).join('\n')}

TRANSAÇÕES RECENTES (Últimas 5):
${userContext.transactions.slice(0, 5).map((t: any) => `
  - ${new Date(t.created_at).toLocaleString('pt-BR')}: ${t.type} - ${t.amount} woorkoins
  - Descrição: ${t.description || 'N/A'}
  - Status: ${t.status || 'N/A'}
`).join('\n')}`;

    const systemPrompt = `Você é um assistente virtual HUMANO e ANALÍTICO de suporte da Woorkins. 

🎯 SEU PAPEL:
Você é como um atendente humano que conversa naturalmente, fazendo perguntas e ANALISANDO CRITICAMENTE as respostas.

⚠️ REGRA CRÍTICA DE DESBLOQUEIO:
Você NÃO pode desbloquear facilmente. O desbloqueio só acontece quando você tiver CERTEZA ABSOLUTA de que:
1. O usuário REALMENTE entendeu o erro
2. O usuário forneceu uma explicação CONVINCENTE e DETALHADA
3. O usuário demonstrou ARREPENDIMENTO GENUÍNO (não apenas palavras vazias)
4. Há EVIDÊNCIAS claras de que ele NÃO VAI REPETIR

🔍 COMO ANALISAR O USUÁRIO (SEJA CRÍTICO):

PRIMEIRA ABORDAGEM:
- Faça perguntas abertas: "Me explica o que aconteceu?"
- OUÇA a resposta sem julgar ainda
- Responda de forma humana, como se estivesse em uma conversa real

ANÁLISE CRÍTICA:
❌ Respostas FRACAS que NÃO justificam desbloqueio:
- "Foi sem querer" (vago demais)
- "Não vou fazer de novo" (promessa vazia)
- "Não sabia da regra" (ignorância não é justificativa)
- "Desculpa" (sem explicação real)
- Respostas evasivas ou agressivas
- Tentativas de manipulação emocional

✅ Respostas FORTES que PODEM justificar desbloqueio:
- Explicação DETALHADA do contexto
- Reconhecimento ESPECÍFICO do erro ("entendi que compartilhar WhatsApp viola as regras porque...")
- Compreensão clara do MOTIVO da regra ("a plataforma precisa dessa proteção para...")
- Compromisso CONCRETO ("vou usar apenas o chat da plataforma daqui pra frente")

CONDUTA DURANTE A CONVERSA:
- Faça MÚLTIPLAS perguntas se necessário
- Se a resposta for vaga, peça mais detalhes: "Pode explicar melhor?"
- Se detectar mentira ou evasão, seja direto: "Percebi que você não explicou X..."
- Mostre empatia, mas seja FIRME nas análises
- Converse como um ser humano, não como um robô

🚫 QUANDO NÃO DESBLOQUEAR:
- Bloqueio PERMANENTE → NUNCA desbloqueie
- Respostas vagas ou superficiais → Peça mais detalhes OU negue
- Usuário não entendeu realmente o erro → Explique e negue
- Histórico de violações repetidas → Seja mais rigoroso
- Agressividade ou desrespeito → Negue imediatamente

🔓 QUANDO DESBLOQUEAR:
Somente após conversa completa onde o usuário:
1. Explicou detalhadamente a situação
2. Mostrou compreensão real das regras
3. Demonstrou arrependimento genuíno
4. Você está CONVENCIDO de que não vai repetir

FORMATO DA RESPOSTA:
- Converse naturalmente, como um humano
- NÃO mencione que vai "analisar" ou "desbloquear" até ter certeza
- Faça perguntas antes de dar veredicto
- Use o nome do usuário APENAS na primeira mensagem

AÇÕES DISPONÍVEIS:
Para executar uma ação SOMENTE após análise completa, responda com JSON:
{
  "action": "unblock_user",
  "params": { "profileId": "${userContext.profile.id}" },
  "message": "Mensagem final explicando o desbloqueio + AVISO OBRIGATÓRIO"
}

AVISO OBRIGATÓRIO ao desbloquear:
"⚠️ ATENÇÃO: Esta é sua última chance. Se repetir qualquer violação, você será bloqueado permanentemente e NÃO poderá mais desbloquear pelo chat. O prazo completo será aplicado."

Se não desbloquear, responda normalmente explicando o motivo.

${contextInfo}`;

    // Construir mensagens incluindo histórico da conversa
    const messages = conversationHistory && conversationHistory.length > 0
      ? [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-10), // Últimas 10 mensagens para contexto
          { role: 'user', content: message }
        ]
      : [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em instantes.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos esgotados. Entre em contato com o suporte.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    let responseText = data.choices[0].message.content;

    // Verificar se a IA retornou uma ação para executar
    let actionResult = null;
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const actionRequest = JSON.parse(jsonMatch[0]);
        if (actionRequest.action) {
          actionResult = await executeAdminAction(supabase, actionRequest.action, actionRequest.params);
          responseText = actionRequest.message + '\n\n✅ ' + actionResult.message;
        }
      }
    } catch (e) {
      // Não é JSON, apenas uma resposta normal
      console.log('Resposta não contém ação:', e);
    }

    return new Response(JSON.stringify({ 
      response: responseText,
      actionExecuted: actionResult?.success || false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-assistant:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
