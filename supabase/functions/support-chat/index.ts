import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helpers
function formatName(name?: string) {
  if (!name) return 'usuário';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

async function getUserContext(supabase: any, profileId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (!profile) return null;

  const { data: violations } = await supabase
    .from('moderation_violations')
    .select('*')
    .eq('profile_id', profile.id)
    .maybeSingle();

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
    .limit(20);

  const { data: rejectedNegotiationMessages } = await supabase
    .from('negotiation_messages')
    .select('*')
    .eq('sender_id', profile.id)
    .eq('moderation_status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: rejectedProposalMessages } = await supabase
    .from('proposal_messages')
    .select('*')
    .eq('sender_id', profile.id)
    .eq('moderation_status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: woorkoinsPayments } = await supabase
    .from('woorkoins_transactions')
    .select('*')
    .eq('profile_id', profile.id)
    .in('type', ['purchase', 'admin_adjustment'])
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    profile,
    violations,
    balance,
    transactions: transactions || [],
    rejectedNegotiationMessages: rejectedNegotiationMessages || [],
    rejectedProposalMessages: rejectedProposalMessages || [],
    woorkoinsPayments: woorkoinsPayments || []
  };
}

async function executeAdminAction(supabase: any, action: string, params: any) {
  switch (action) {
    case 'unblock_user':
      // Registrar que desbloqueou hoje para evitar repetição
      await supabase
        .from('ai_assistant_conversations')
        .upsert({
          profile_id: params.profileId,
          messages: JSON.stringify([{ role: 'system', content: `DESBLOQUEIO_REALIZADO_${new Date().toISOString()}` }]),
          updated_at: new Date().toISOString()
        }, { onConflict: 'profile_id' });

      await supabase
        .from('system_blocks')
        .delete()
        .eq('profile_id', params.profileId);

      await supabase
        .from('moderation_violations')
        .update({ violation_count: 0, blocked_until: null, last_violation_at: null })
        .eq('profile_id', params.profileId);

      return { success: true, message: 'Desbloqueio realizado com sucesso.' };

    case 'add_woorkoins': {
      const { data: current } = await supabase
        .from('woorkoins_balance')
        .select('balance')
        .eq('profile_id', params.profileId)
        .maybeSingle();

      await supabase
        .from('woorkoins_balance')
        .upsert({ profile_id: params.profileId, balance: (current?.balance || 0) + params.amount }, { onConflict: 'profile_id' });

      await supabase
        .from('woorkoins_transactions')
        .insert({ profile_id: params.profileId, type: 'admin_adjustment', amount: params.amount, description: params.reason || 'Ajuste administrativo' });

      return { success: true, message: `${params.amount} woorkoins adicionados.` };
    }

    case 'compensate_error': {
      const { data: current } = await supabase
        .from('woorkoins_balance')
        .select('balance')
        .eq('profile_id', params.profileId)
        .maybeSingle();

      const total = params.originalAmount + 100;
      await supabase
        .from('woorkoins_balance')
        .upsert({ profile_id: params.profileId, balance: (current?.balance || 0) + total }, { onConflict: 'profile_id' });

      await supabase
        .from('woorkoins_transactions')
        .insert({ profile_id: params.profileId, type: 'admin_adjustment', amount: total, description: `Compensação por erro (${params.reason || 'sem motivo'}) + 100 de desculpas` });

      return { success: true, message: `Compensação realizada: ${params.originalAmount} + 100 woorkoins.` };
    }

    default:
      return { success: false, message: 'Ação não reconhecida' };
  }
}

async function applySupportPause(supabase: any, profileId: string) {
  const { data: existing } = await supabase
    .from('message_spam_tracking')
    .select('*')
    .eq('profile_id', profileId)
    .eq('context', 'support_chat')
    .maybeSingle();

  const newCount = (existing?.spam_count || 0) + 1;
  const blockMinutes = Math.min(5 * Math.pow(2, newCount - 1), 60); // 5,10,20,40,60

  await supabase
    .from('message_spam_tracking')
    .upsert({
      profile_id: profileId,
      context: 'support_chat',
      spam_count: newCount,
      last_spam_at: new Date().toISOString(),
      blocked_until: new Date(Date.now() + blockMinutes * 60 * 1000).toISOString(),
      block_duration_minutes: blockMinutes,
      updated_at: new Date().toISOString()
    }, { onConflict: 'profile_id,context' });

  return blockMinutes;
}

async function wasUnblockedToday(supabase: any, profileId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('ai_assistant_conversations')
    .select('messages, updated_at')
    .eq('profile_id', profileId)
    .gte('updated_at', start.toISOString())
    .maybeSingle();
  if (!data?.messages) return false;
  const msgs = typeof data.messages === 'string' ? JSON.parse(data.messages) : data.messages;
  return msgs.some((m: any) => m.role === 'system' && m.content?.includes('DESBLOQUEIO_REALIZADO_'));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId, profileId, attachments } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verificar se está bloqueado por spam
    const { data: spamBlock } = await supabase
      .from('message_spam_tracking')
      .select('*')
      .eq('profile_id', profileId)
      .eq('context', 'support_chat')
      .maybeSingle();
    
    if (spamBlock?.blocked_until) {
      const blockedUntil = new Date(spamBlock.blocked_until);
      if (blockedUntil > new Date()) {
        const remainingMinutes = Math.ceil((blockedUntil.getTime() - Date.now()) / 60000);
        return new Response(JSON.stringify({ 
          error: 'Você está temporariamente bloqueado de enviar mensagens.',
          blocked: true,
          blockedUntil: spamBlock.blocked_until,
          reason: 'Por favor, aguarde alguns minutos antes de continuar.',
          remainingMinutes
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from('support_conversations')
        .insert({
          profile_id: profileId,
          status: 'active',
          reason: 'document_verification_help'
        })
        .select()
        .single();

      if (convError) throw convError;
      convId = newConv.id;
    }

    // Save user message
    const { error: msgError } = await supabase
      .from('support_messages')
      .insert({
        conversation_id: convId,
        sender_id: profileId,
        sender_type: 'user',
        content: message,
        attachments: attachments || null
      });

    if (msgError) throw msgError;

    // Get conversation history
    const { data: messages } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    // Check if should escalate to human
    const messageCount = messages?.length || 0;
    const shouldEscalate = messageCount > 6 || message.toLowerCase().includes('atendente') || message.toLowerCase().includes('humano');

    if (shouldEscalate) {
      // Update conversation to pending human
      await supabase
        .from('support_conversations')
        .update({ status: 'pending_human' })
        .eq('id', convId);

      const response = {
        conversationId: convId,
        response: 'Entendi que você precisa de ajuda humana. Estou transferindo você para nossa equipe de suporte. Em breve um atendente irá responder.',
        escalated: true
      };

      // Save AI response
      await supabase
        .from('support_messages')
        .insert({
          conversation_id: convId,
          sender_id: profileId,
          sender_type: 'ai',
          content: response.response
        });

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar contexto completo do usuário
    const userContext = await getUserContext(supabase, profileId);
    if (!userContext) throw new Error('Perfil não encontrado');

    // Formatar nome
    const firstName = formatName(userContext.profile.full_name?.split(' ')[0]);

    // Verificar se já desbloqueou hoje
    const alreadyUnblocked = await wasUnblockedToday(supabase, profileId);

    // Construir contexto de status
    const nowIso = new Date().toISOString();
    const { data: sbBlocks } = await supabase
      .from('system_blocks')
      .select('*')
      .eq('profile_id', profileId)
      .or(`is_permanent.eq.true,blocked_until.gt.${nowIso}`)
      .limit(1);
    const activeBlock = sbBlocks?.[0];
    
    const statusContext = activeBlock
      ? `BLOQUEIO ATIVO (${activeBlock.is_permanent ? 'permanente' : `até ${activeBlock.blocked_until}`}): ${activeBlock.reason || 'sem motivo'}.`
      : `SEM BLOQUEIO ATIVO.`;

    // Construir prompt da IA com lógica curta e objetiva
    const systemPrompt = `Você é uma assistente virtual ALEGRE e HUMANIZADA da Woorkins! 😊

💕 PERSONALIDADE:
- BREVE (máximo 2-3 frases curtas)
- Use emojis (😊 ✨ 💪)
- **Negrito** para destaques
- Seja EMPÁTICA e OBJETIVA

🚑 PEDIDOS PESSOAIS/SENSÍVEIS (saúde mental, não quer viver, etc.):
1ª vez: "Sinto muito. Procure ajuda imediata no CVV (188) ou Bombeiros (193). 💙"
2ª vez: "Realmente não posso ajudar com isso. Busque o CVV (188) agora. Vou me ausentar."
→ Retorne JSON para pausar:
{
  "spam_detected": true,
  "reason": "Tema sensível fora do escopo",
  "message": "Procure o CVV (188). 💙 Vou pausar alguns minutos."
}

⚠️ PERGUNTAS FORA DO ESCOPO (não relacionadas à Woorkins):
1ª vez: "Oi ${firstName}! 😊 Só posso ajudar com a Woorkins. Como posso te ajudar?"
2ª vez: "Realmente só falo sobre a Woorkins. Tem alguma dúvida sobre a plataforma?"
3ª vez: Retorne JSON:
{
  "spam_detected": true,
  "reason": "Insistência em tópico fora do escopo",
  "message": "${firstName}, vou pausar uns minutos. Depois falamos sobre a Woorkins, ok? 🙏"
}

🚨 BLOQUEIOS:
- Se ${alreadyUnblocked ? 'JÁ FOI DESBLOQUEADO HOJE, NÃO desbloqueie novamente!' : 'primeira vez hoje que pede desbloqueio, pode considerar'}
- 1ª msg: "Vou verificar sua conta... 🔍"
- Verifique os dados de ${statusContext}
- 2ª msg: Se for convincente e ${!alreadyUnblocked ? 'primeira vez hoje' : 'MAS JÁ DESBLOQUEOU HOJE'} → decida
- Se NÃO convincente ou já desbloqueado: "Entendo ${firstName} ❤️, mas precisa aguardar o bloqueio. Você é importante! 💪"
- Se insistir após decisão: Retorne JSON:
{
  "spam_detected": true,
  "reason": "Insistência após decisão tomada",
  "message": "Já expliquei, ${firstName}. Vou pausar uns minutos. 🙏"
}

📄 DOCUMENTOS REJEITADOS:
"Vamos resolver! 😊 Preciso: **Frente**, **Verso**, **Selfie**. Clique no **📎**!"

🔧 OUTRAS DÚVIDAS:
- Seja específica: "Clique **Configurações** > **Pagamentos**"
- Mude de assunto se o usuário mudar
- Nunca repita perguntas

AÇÕES ADMIN (use JSON quando necessário):
Desbloqueio (primeira vez hoje): { "action": "unblock_user", "params": { "profileId": "${profileId}" } }
Compensar erro: { "action": "compensate_error", "params": { "profileId": "${profileId}", "originalAmount": X, "reason": "motivo" } }
Adicionar woorkoins: { "action": "add_woorkoins", "params": { "profileId": "${profileId}", "amount": 100, "reason": "compensação" } }

CONTEXTO DO USUÁRIO:
- Nome: ${firstName}
- Saldo: ${userContext.balance?.balance || 0} woorkoins
- Status: ${statusContext}
- Desbloqueado hoje: ${alreadyUnblocked ? 'SIM ⚠️ NÃO DESBLOQUEAR NOVAMENTE' : 'Não'}
${userContext.rejectedNegotiationMessages.length > 0 ? `- Msgs bloqueadas (negociação): ${userContext.rejectedNegotiationMessages.length}` : ''}
${userContext.rejectedProposalMessages.length > 0 ? `- Msgs bloqueadas (proposta): ${userContext.rejectedProposalMessages.length}` : ''}`;

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
          ...(messages?.map(m => ({
            role: m.sender_type === 'user' ? 'user' : 'assistant',
            content: m.content
          })) || [])
        ],
        max_tokens: 600
      })
    });

    if (!aiResponse.ok) {
      throw new Error('AI response failed');
    }

    const aiData = await aiResponse.json();
    let aiMessage = aiData.choices[0].message.content;

    // Verificar se a IA detectou spam/insistência ou retornou ação
    let spamDetected = false;
    let spamReason = '';
    let actionResult = null;
    
    try {
      const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Spam detectado
        if (parsed.spam_detected) {
          spamDetected = true;
          spamReason = parsed.reason || 'Comportamento inadequado';
          const blockMinutes = await applySupportPause(supabase, profileId);
          aiMessage = parsed.message || 'Por favor, mantenha o respeito para que eu possa te ajudar melhor.';
        }
        // Ação administrativa
        else if (parsed.action) {
          actionResult = await executeAdminAction(supabase, parsed.action, parsed.params);
          aiMessage = parsed.message + '\n\n✅ ' + actionResult.message;
        }
      }
    } catch (e) {
      console.log('Resposta não contém JSON:', e);
    }

    // Save AI response
    await supabase
      .from('support_messages')
      .insert({
        conversation_id: convId,
        sender_id: profileId,
        sender_type: 'ai',
        content: aiMessage
      });

    return new Response(JSON.stringify({
      conversationId: convId,
      response: aiMessage,
      escalated: false,
      spamDetected,
      spamReason,
      actionExecuted: actionResult?.success || false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Support chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
