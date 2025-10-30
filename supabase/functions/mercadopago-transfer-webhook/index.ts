import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function logStep(step: string, details?: any) {
  console.log(`[MP Transfer Webhook] ${step}`, details || '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Recebendo webhook do Mercado Pago');

    const webhookData = await req.json();
    logStep('Dados do webhook', webhookData);

    // Validar tipo de notificação
    if (webhookData.type !== 'payment') {
      logStep('Tipo de notificação ignorado', webhookData.type);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const paymentId = webhookData.data?.id;
    if (!paymentId) {
      logStep('Payment ID não encontrado no webhook');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar detalhes do payment no Mercado Pago
    const mercadoPagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${mercadoPagoToken}`
        }
      }
    );

    const paymentData = await paymentResponse.json();
    logStep('Dados do pagamento', paymentData);

    // Buscar withdrawal_request pelo mercadopago_transfer_id
    const { data: withdrawal, error: withdrawalError } = await supabaseClient
      .from('withdrawal_requests')
      .select('*')
      .eq('mercadopago_transfer_id', paymentId.toString())
      .single();

    if (withdrawalError || !withdrawal) {
      logStep('Withdrawal request não encontrado para este payment_id', paymentId);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logStep('Withdrawal encontrado', withdrawal.id);

    // Atualizar status se mudou
    if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
      logStep('Payment rejeitado/cancelado, atualizando withdrawal');

      // Reverter valores na wallet
      const { data: wallet } = await supabaseClient
        .from('freelancer_wallet')
        .select('available_balance, total_withdrawn')
        .eq('profile_id', withdrawal.profile_id)
        .single();

      if (wallet) {
        await supabaseClient
          .from('freelancer_wallet')
          .update({
            available_balance: wallet.available_balance + withdrawal.amount,
            total_withdrawn: Math.max(0, wallet.total_withdrawn - withdrawal.amount)
          })
          .eq('profile_id', withdrawal.profile_id);
      }

      // Atualizar withdrawal como failed
      await supabaseClient
        .from('withdrawal_requests')
        .update({
          status: 'failed',
          error_message: paymentData.status_detail || 'Transferência rejeitada pelo Mercado Pago'
        })
        .eq('id', withdrawal.id);

      // Notificar usuário
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: withdrawal.profile_id,
          type: 'withdrawal_failed',
          title: 'Saque não processado',
          message: `Seu saque de R$ ${withdrawal.amount.toFixed(2)} não foi processado. O valor foi devolvido à sua carteira.`,
          link: '/financeiro'
        });

      logStep('Withdrawal atualizado para failed e usuário notificado');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logStep('Erro ao processar webhook', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
