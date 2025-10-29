import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId, conversationType } = await req.json();

    if (!messageId || !conversationType) {
      throw new Error('messageId and conversationType são obrigatórios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determinar tabela baseado no tipo de conversa
    const table = conversationType === 'proposal' ? 'proposal_messages' : 'negotiation_messages';

    // Buscar mensagem
    const { data: message, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      console.error('Erro ao buscar mensagem:', fetchError);
      throw new Error('Mensagem não encontrada');
    }

    // Se já foi moderada, não fazer nada
    if (message.moderation_status !== 'pending') {
      console.log('Mensagem já moderada:', message.moderation_status);
      return new Response(JSON.stringify({ 
        success: true, 
        status: message.moderation_status 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔍 Moderando mensagem:', messageId);

    // Buscar mensagens recentes para contexto
    const idField = conversationType === 'proposal' ? 'proposal_id' : 'negotiation_id';
    const conversationId = message[idField];

    const { data: recentMessages } = await supabase
      .from(table)
      .select('content, sender_id, created_at')
      .eq(idField, conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Chamar serviço de moderação
    const moderationResponse = await supabase.functions.invoke('moderate-message', {
      body: {
        content: message.content || '',
        imageUrl: message.media_url || null,
        recentMessages: recentMessages || []
      }
    });

    if (moderationResponse.error) {
      console.error('Erro na moderação:', moderationResponse.error);
      // Em caso de erro, aprovar por padrão
      await supabase
        .from(table)
        .update({ 
          moderation_status: 'approved',
          rejection_reason: null
        })
        .eq('id', messageId);

      return new Response(JSON.stringify({ 
        success: true, 
        status: 'approved',
        fallback: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const moderationResult = moderationResponse.data;
    
    console.log('📊 Resultado da moderação:', {
      approved: moderationResult.approved,
      confidence: moderationResult.confidence,
      flagged: moderationResult.flagged
    });

    // Atualizar status da mensagem baseado no resultado
    let updateData: any = {};

    if (moderationResult.approved === false) {
      // Mensagem rejeitada
      updateData = {
        moderation_status: 'rejected',
        rejection_reason: moderationResult.reason || 'Violação das regras da plataforma'
      };

      console.log('❌ Mensagem rejeitada:', messageId);

      // Registrar violação no blocked_messages
      await supabase.from('blocked_messages').insert({
        profile_id: message.sender_id,
        conversation_id: conversationId,
        conversation_type: conversationType,
        original_content: message.content,
        moderation_category: moderationResult.category || 'other',
        moderation_reason: moderationResult.reason,
        file_url: message.media_url,
        file_name: message.media_name,
        file_type: message.media_type
      });

      // Aplicar bloqueio progressivo se for violação grave
      if (moderationResult.severe) {
        await supabase.rpc('apply_progressive_system_block', {
          p_profile_id: message.sender_id,
          p_violation_category: moderationResult.category || 'other',
          p_reason: moderationResult.reason
        });
      }
    } else {
      // Mensagem aprovada
      updateData = {
        moderation_status: 'approved',
        rejection_reason: null
      };

      console.log('✅ Mensagem aprovada:', messageId);
    }

    // Atualizar mensagem
    const { error: updateError } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', messageId);

    if (updateError) {
      console.error('Erro ao atualizar status:', updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      status: updateData.moderation_status,
      reason: updateData.rejection_reason,
      flagged: moderationResult.flagged
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro em process-message-moderation:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
