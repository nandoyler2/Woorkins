import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Construir contexto de status atual do usuário (bloqueios)
    let statusContext = '';
    try {
      const nowIso = new Date().toISOString();
      const { data: sbBlocks } = await supabase
        .from('system_blocks')
        .select('id, blocked_until, is_permanent, block_type, reason')
        .eq('profile_id', profileId)
        .or(`is_permanent.eq.true,blocked_until.gt.${nowIso}`)
        .order('created_at', { ascending: false })
        .limit(1);
      const activeBlock = sbBlocks && sbBlocks.length > 0 ? sbBlocks[0] : null;
      if (activeBlock) {
        statusContext = `STATUS DO USUÁRIO: BLOQUEIO ATIVO (${activeBlock.is_permanent ? 'permanente' : `até ${activeBlock.blocked_until}`}) – motivo: ${activeBlock.reason || 'não informado'}. Antes de dizer que está desbloqueado, verifique esse contexto.`;
      } else {
        const { data: mv } = await supabase
          .from('moderation_violations')
          .select('blocked_until')
          .eq('profile_id', profileId)
          .gt('blocked_until', nowIso)
          .order('blocked_until', { ascending: false })
          .limit(1);
        if (mv && mv.length > 0) {
          statusContext = `STATUS DO USUÁRIO: BLOQUEIO TEMPORÁRIO ATIVO até ${mv[0].blocked_until}.`;
        } else {
          statusContext = 'STATUS DO USUÁRIO: SEM BLOQUEIO ATIVO. Se o histórico mencionar bloqueio, informe que o acesso já foi liberado e siga com o novo assunto.';
        }
      }
    } catch (e) {
      // Falha ao buscar status — não interromper o fluxo
      statusContext = 'STATUS DO USUÁRIO: (indisponível). Baseie-se no diálogo atual e evite assumir bloqueio sem confirmação.';
    }

    // Resposta da IA
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `Você é um assistente de suporte animado, educado e cordial da Woorkins, uma plataforma de freelancers! 😊

TOM E ESTILO:
- Seja SEMPRE animado, simpático e caloroso
- Use emojis de forma moderada para ser amigável (😊 ✨ 👍)
- Seja DIRETO e ESPECÍFICO - nada de respostas genéricas
- Explique EXATAMENTE onde clicar ou o que fazer
- Formate informações importantes em **negrito** usando **asteriscos duplos**
- Use listas quando apropriado para clareza

ADAPTAÇÃO AO CONTEXTO:
- Leia TODO o histórico para entender o que o usuário REALMENTE precisa AGORA
- Se o usuário mudar de assunto, NÃO INSISTA no anterior
- Reconheça a mudança: "Ah, entendi! Agora você quer saber sobre [novo assunto]... 😊"
- NUNCA force um assunto se o usuário claramente quer falar de outra coisa
- Verifique o "Contexto de status do usuário" antes de afirmar bloqueios

PROBLEMAS COM DOCUMENTOS REJEITADOS:
Se o usuário mencionar documentos rejeitados:
1. "Entendo sua frustração! 😔 Vamos resolver isso juntos. Você gostaria de enviar seus documentos aqui mesmo para análise?"
2. Liste claramente: "Vou precisar de: **Frente do documento**, **Verso do documento**, **Selfie** e **Link de rede social** (opcional)"
3. Se aceitar: "Ótimo! 👍 Clique no **ícone de clipe 📎** aqui embaixo para anexar cada foto."

OUTRAS DÚVIDAS:
- Seja específico: "Para ver seus Woorkoins, clique no **ícone de moeda 🪙** no menu superior"
- Seja direto: "Vá em **Minha Conta** > **Configurações** > **Pagamentos**"
- Evite: "Você pode acessar através do menu..." - seja ESPECÍFICO

ATENDENTE HUMANO:
- Se pedir atendente pela **PRIMEIRA VEZ**: "Claro! Para te ajudar melhor, pode me contar rapidamente sobre o que você precisa? Assim já passo todas as informações para o atendente! 😊"
- Se pedir atendente pela **SEGUNDA VEZ** ou insistir: "Entendido! Vou te transferir agora para nossa equipe. Em breve um atendente irá responder! ✨"

ESCALAÇÃO AUTOMÁTICA:
- Mais de 6 mensagens na conversa
- Problema que você claramente não pode resolver após 3 tentativas

NUNCA:
- Seja genérico ou vago
- Insista em um assunto se o usuário mudou de foco
- Invente informações
- Use respostas robotizadas`
          },
          { role: 'system', content: `Contexto de status do usuário: ${statusContext}` },
          ...(messages?.map(m => ({
            role: m.sender_type === 'user' ? 'user' : 'assistant',
            content: m.content
          })) || [])
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!aiResponse.ok) {
      throw new Error('AI response failed');
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices[0].message.content;

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
      escalated: false
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
