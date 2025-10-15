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

  const { data: blocks } = await supabase
    .from('system_blocks')
    .select('*')
    .eq('profile_id', profile?.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: violations } = await supabase
    .from('moderation_violations')
    .select('*')
    .eq('profile_id', profile?.id)
    .single();

  const { data: balance } = await supabase
    .from('woorkoins_balance')
    .select('*')
    .eq('profile_id', profile?.id)
    .single();

  const { data: transactions } = await supabase
    .from('woorkoins_transactions')
    .select('*')
    .eq('profile_id', profile?.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: recentMessages } = await supabase
    .from('negotiation_messages')
    .select('*, negotiations(*)')
    .eq('sender_id', profile?.id)
    .eq('moderation_status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    profile,
    blocks: blocks || [],
    violations,
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
      await supabase
        .from('system_blocks')
        .delete()
        .eq('profile_id', params.profileId);
      return { success: true, message: 'Usuário desbloqueado com sucesso' };

    case 'add_woorkoins':
      const { data: currentBalance } = await supabase
        .from('woorkoins_balance')
        .select('balance')
        .eq('profile_id', params.profileId)
        .single();

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
        .update({ violation_count: 0, blocked_until: null })
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
    const { message } = await req.json();
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

    // Construir contexto para a IA
    const contextInfo = `
CONTEXTO DO USUÁRIO:
- Nome: ${userContext.profile?.full_name || 'Não informado'}
- Saldo Woorkoins: ${userContext.balance?.balance || 0}

BLOQUEIOS ATIVOS: ${userContext.blocks.length > 0 ? 'SIM' : 'NÃO'}
${userContext.blocks.map((b: any) => `
  - Tipo: ${b.block_type}
  - Motivo: ${b.reason}
  - Permanente: ${b.is_permanent ? 'Sim' : 'Não'}
  - Expira em: ${b.blocked_until || 'N/A'}
`).join('\n')}

VIOLAÇÕES DE MODERAÇÃO:
- Total: ${userContext.violations?.violation_count || 0}
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

    const systemPrompt = `Você é um assistente virtual INTELIGENTE de suporte da Woorkins. 

SUAS CAPACIDADES:
1. Analisar dados REAIS do usuário (bloqueios, transações, mensagens)
2. EXECUTAR AÇÕES quando apropriado:
   - Desbloquear usuários quando bloqueio injustificado
   - Adicionar woorkoins se transação não processada
   - Resetar violações se foram incorretas

IMPORTANTE:
- SEMPRE analise os dados fornecidos antes de responder
- Se o usuário foi bloqueado, VERIFIQUE se as mensagens bloqueadas realmente violaram regras
- Se a compra de woorkoins não aparece nas transações mas usuário alega ter comprado, ADICIONE os woorkoins
- Seja transparente sobre o que você encontrou e as ações que tomou
- Use tom profissional mas empático

AÇÕES DISPONÍVEIS:
Para executar uma ação, responda com JSON no formato:
{
  "action": "unblock_user" | "add_woorkoins" | "reset_violations",
  "params": { "profileId": "uuid", "amount": number, "reason": "string" },
  "message": "Mensagem para o usuário"
}

Se não precisar executar ação, responda normalmente explicando o que você encontrou.

${contextInfo}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
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
