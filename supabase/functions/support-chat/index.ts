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

    // AI response
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
            content: `Você é um assistente de suporte especializado em ajudar usuários com verificação de documentos.

IMPORTANTE:
- Seja empático e prestativo
- Se o usuário menciona que documentos foram rejeitados, pergunte se ele gostaria de ajuda
- Se sim, peça os documentos em anexo: frente, verso, selfie e perfil de rede social
- Explique de forma clara e simples
- Se você não consegue resolver após 3 mensagens, sugira falar com atendente humano
- NUNCA invente informações ou processos que não existem

Contexto: Sistema de verificação de identidade para plataforma de freelancers.`
          },
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
