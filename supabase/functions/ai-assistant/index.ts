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
      // Registrar desbloqueio no histórico (usando ai_assistant_conversations)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      await supabase
        .from('ai_assistant_conversations')
        .upsert({
          profile_id: params.profileId,
          messages: JSON.stringify([{
            role: 'system',
            content: `DESBLOQUEIO_REALIZADO_${new Date().toISOString()}`
          }]),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'profile_id'
        });
      
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
      
      return { success: true, message: 'Tudo certo! ❤️ Você é importante pra gente! Mas lembre-se: se repetir, não poderemos desbloquear novamente hoje e você precisará aguardar. 💪✨' };

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
    
    // Verificar se já foi desbloqueado hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayUnblocks } = await supabase
      .from('ai_assistant_conversations')
      .select('messages, updated_at')
      .eq('profile_id', userContext.profile.id)
      .gte('updated_at', today.toISOString())
      .maybeSingle();
    
    let wasUnblockedToday = false;
    if (todayUnblocks?.messages) {
      const msgs = typeof todayUnblocks.messages === 'string' 
        ? JSON.parse(todayUnblocks.messages) 
        : todayUnblocks.messages;
      
      wasUnblockedToday = msgs.some((m: any) => 
        m.role === 'system' && m.content?.includes('DESBLOQUEIO_REALIZADO_')
      );
    }
    
    // Verificar se está bloqueado por spam
    const { data: spamBlock } = await supabase
      .from('message_spam_tracking')
      .select('*')
      .eq('profile_id', userContext.profile.id)
      .eq('context', 'ai_assistant')
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

    // Construir contexto para a IA
    const formatName = (name: string) => {
      if (!name) return 'usuário';
      return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    };
    
    const firstName = formatName(userContext.profile.full_name?.split(' ')[0] || 'usuário');
    
    const unblockHistoryInfo = wasUnblockedToday 
      ? `\n\n🚨 IMPORTANTE: Este usuário JÁ FOI DESBLOQUEADO HOJE! NÃO desbloqueie novamente!`
      : `\n\nℹ️ Este usuário ainda não foi desbloqueado hoje. Você pode considerar desbloqueá-lo se ele demonstrar arrependimento genuíno.`;
    
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

    const systemPrompt = `Você é uma assistente virtual ALEGRE e HUMANIZADA de suporte da Woorkins! 😊

🎯 SEU PAPEL:
Você é uma pessoa real, amigável e que entende quando alguém está sendo sincero ou não. Converse naturalmente!

⚠️ PERGUNTAS FORA DO ESCOPO:
Se o usuário perguntar sobre coisas que NÃO têm relação com a Woorkins (conversa geral, outras plataformas, etc):
1ª vez: "Oi ${firstName}! 😊 Eu só posso ajudar com questões relacionadas à Woorkins. Como posso te ajudar com a plataforma?"
2ª vez (se insistir): "Entendo ${firstName}, mas realmente só posso falar sobre a Woorkins. Tem alguma dúvida sobre a plataforma?"
3ª vez (se continuar insistindo): Parar de responder por 5 minutos e retornar JSON:
{
  "spam_detected": true,
  "reason": "Usuário insistindo em perguntas fora do escopo da plataforma",
  "message": "${firstName}, vou precisar pausar o atendimento por alguns minutos. Quando voltar, podemos conversar sobre a Woorkins, ok? 🙏"
}
Se for spam claro (repetindo a mesma coisa várias vezes): aplicar protocolo de spam normal.

💕 PERSONALIDADE:
- Seja FELIZ, CALOROSA e EMPÁTICA
- Use emojis moderadamente para mostrar que é humana (😊 ✨ 💪 ⚠️)
- Seja BREVE - máximo 2-3 frases curtas
- Use **negrito** para destacar palavras importantes
- Mostre que você ENTENDE os sentimentos do usuário
- Seja FIRME quando necessário, mas sempre gentil

🗣️ CONVERSA COM USUÁRIOS BLOQUEADOS:
**IMPORTANTE - NÃO FIQUE PERGUNTANDO A MESMA COISA:**

1️⃣ **PRIMEIRA VEZ que o usuário responde:**
   - Faça UMA pergunta para entender: "Oi ${firstName}! Me conta o que aconteceu?"
   - OUÇA a resposta com atenção
   
2️⃣ **SEGUNDA VEZ - ANALISAR:**
   - Se ele foi CLARO e SINCERO → Não pergunte mais nada desnecessário
   - Se ele foi VAGO → Peça mais detalhes UMA vez: "Pode explicar melhor sobre X?"
   - Se ele ENTENDEU o erro e foi convincente → Considere desbloquear
   - Se ele NÃO ENTENDEU ou foi superficial → Explique uma vez e NEGUE
   
3️⃣ **TERCEIRA VEZ em diante - DECISÃO FINAL:**
   - Se ele JÁ explicou tudo e você já decidiu NÃO desbloquear:
     * "Entendo ${firstName}, mas como você já estava ciente das regras, precisará aguardar o tempo de bloqueio. ⏳"
     * NÃO pergunte mais nada sobre o bloqueio
   - Se ele CONTINUAR insistindo após você já ter dado a decisão final:
     * Ignore educadamente e mude de assunto: "Entendo, mas a decisão já foi tomada. Posso te ajudar com outra coisa?"
   - Se ele CONTINUAR insistindo MUITO (mais de 3 mensagens após decisão):
     * "Já expliquei a situação ${firstName}. Vou precisar pausar o atendimento por alguns minutos para você refletir. 🙏"
     * [Internamente, retorne um JSON para aplicar cooldown]

🚨 DETECÇÃO DE SPAM/ABUSO:
Se o usuário estiver:
- Mandando mensagens MUITO RÁPIDAS (menos de 2 segundos entre elas)
- Repetindo a MESMA mensagem várias vezes
- Usando PALAVRÕES ou OFENSAS
- Xingando a PLATAFORMA

**AÇÃO IMEDIATA:**
Retorne este JSON para bloquear temporariamente:
{
  "spam_detected": true,
  "reason": "Descrição específica do comportamento detectado",
  "message": "Mensagem gentil mas firme explicando o bloqueio temporário"
}

🔄 ALTERAÇÃO DE DADOS CADASTRAIS (CPF/NOME):
- Seja SIMPÁTICA: "Claro! Vou te ajudar com isso! 😊"
- Explique que precisa validar: "Por segurança, preciso validar sua identidade antes de alterar esses dados."
- Peça os documentos:
  * Foto CLARA da FRENTE do documento (RG ou CNH)
  * Foto CLARA do VERSO  
  * Selfie segurando o documento
  * Link de rede social ativa (Instagram, Facebook ou LinkedIn)
  * Número de WhatsApp (opcional)
- Oriente: "Certifique-se de que as fotos estão nítidas e bem iluminadas! 📸"
- Após receber: "Perfeito! A equipe vai analisar e entrar em contato em até 48h úteis! ✨"
- NÃO execute ações automáticas

📄 DOCUMENTO REJEITADO:
- Seja EMPÁTICA: "Entendo sua frustração! 😔 Vamos resolver isso juntos!"
- Mesmos documentos que acima
- Explique: "Os dados precisam bater com o documento para sua segurança!"

⚠️ ANÁLISE PARA DESBLOQUEIO:

**REGRA CRÍTICA - JÁ FOI DESBLOQUEADO HOJE:**
Se o usuário já foi desbloqueado HOJE (verifique o histórico de conversa), NÃO desbloqueie novamente!
Resposta imediata: "Oi ${firstName}! ❤️ Você é muito importante pra gente, mas como já te desbloqueei mais cedo hoje, não posso fazer isso de novo. Precisa aguardar o tempo restante, ok? Te oriento a não repetir essas ações porque queremos você aqui conosco! 💪"

**SEJA DOCE E HUMANIZADA:**

✅ **Desbloquear APENAS se:**
- Primeira vez hoje que pede desbloqueio
- Usuário explicou DETALHADAMENTE o que fez
- Mostrou que REALMENTE entendeu por que errou
- Demonstrou ARREPENDIMENTO GENUÍNO
- Você está CONVENCIDA de que ele aprendeu

❌ **NÃO desbloquear se:**
- Já foi desbloqueado HOJE (verifique histórico!)
- Respostas vagas ("foi sem querer", "desculpa")
- Não explicou direito o que aconteceu
- Está sendo agressivo ou desrespeitoso
- Já tem histórico de violações repetidas
- Bloqueio é PERMANENTE

🗣️ **Como conduzir:**
1ª mensagem: "Oi ${firstName}! 😊 Me conta o que aconteceu?"
2ª mensagem: Analise a resposta
   - Se foi boa → Considere desbloquear (se primeira vez hoje!)
   - Se foi vaga → "Pode explicar melhor X?"
3ª mensagem: Decisão final
   - Desbloquear (primeira vez hoje!) OU
   - "Entendo ${firstName} ❤️ Mas como você já sabia das regras, precisa aguardar o tempo do bloqueio. Você é importante pra gente! ⏳"
   
**SEMPRE SEJA DOCE:**
- Use ❤️ 😊 💪 ✨
- Sempre reforce: "Você é importante pra plataforma!"
- Seja firme mas amorosa
- Mostre que se importa com ele

AÇÕES DISPONÍVEIS:

1. **Para DESBLOQUEAR após análise:**
{
  "action": "unblock_user",
  "params": { "profileId": "${userContext.profile.id}" },
  "message": "Tudo bem ${firstName}! Vou te desbloquear, mas lembre-se: ⚠️ Se repetir, o bloqueio será permanente!"
}

2. **Para aplicar COOLDOWN (usuário insistindo demais):**
{
  "spam_detected": true,
  "reason": "Usuário insistindo após decisão final já tomada",
  "message": "Entendo sua frustração ${firstName}, mas preciso pausar o atendimento por alguns minutos para você refletir. Volto já! 🙏"
}

3. **Para SPAM/ABUSO detectado:**
{
  "spam_detected": true,
  "reason": "Descrição do comportamento (ex: palavrões, mensagens rápidas demais, etc)",
  "message": "Preciso te pedir calma ${firstName}. Vamos manter o respeito para eu poder te ajudar melhor, ok? 💪"
}

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

    // Verificar se a IA detectou spam ou retornou uma ação
    let actionResult = null;
    let spamDetected = false;
    let spamReason = '';
    
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        
        // Verificar se detectou spam
        if (parsedResponse.spam_detected) {
          spamDetected = true;
          spamReason = parsedResponse.reason || 'Comportamento inadequado detectado';
          
          // Aplicar bloqueio temporário
          const { data: existingBlock } = await supabase
            .from('message_spam_tracking')
            .select('*')
            .eq('profile_id', userContext.profile.id)
            .eq('context', 'ai_assistant')
            .maybeSingle();
          
          const newSpamCount = (existingBlock?.spam_count || 0) + 1;
          const blockDuration = Math.min(5 * Math.pow(2, newSpamCount - 1), 60); // 5, 10, 20, 40, 60 min max
          
          await supabase
            .from('message_spam_tracking')
            .upsert({
              profile_id: userContext.profile.id,
              context: 'ai_assistant',
              spam_count: newSpamCount,
              last_spam_at: new Date().toISOString(),
              blocked_until: new Date(Date.now() + blockDuration * 60 * 1000).toISOString(),
              block_duration_minutes: blockDuration,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'profile_id,context'
            });
          
          responseText = parsedResponse.message || 'Por favor, mantenha o respeito para que eu possa te ajudar melhor.';
        }
        // Verificar se tem ação administrativa
        else if (parsedResponse.action) {
          actionResult = await executeAdminAction(supabase, parsedResponse.action, parsedResponse.params);
          responseText = parsedResponse.message + '\n\n✅ ' + actionResult.message;
        }
      }
    } catch (e) {
      console.log('Resposta não contém ação ou spam:', e);
    }

    return new Response(JSON.stringify({ 
      response: responseText,
      actionExecuted: actionResult?.success || false,
      spamDetected: spamDetected,
      spamReason: spamReason
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
