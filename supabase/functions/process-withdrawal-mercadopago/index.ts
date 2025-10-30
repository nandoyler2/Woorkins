import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WithdrawalRequest {
  id: string;
  profile_id: string;
  amount: number;
  status: string;
  pix_key?: string;
  pix_key_type?: string;
}

interface PaymentSettings {
  pix_key: string;
  pix_key_type: string;
}

interface FreelancerWallet {
  available_balance: number;
}

function maskPixKey(key: string, type: string): string {
  if (type === 'cpf') {
    return key.replace(/(\d{3})\d{6}(\d{2})/, '$1.***.**$2');
  } else if (type === 'phone') {
    return key.replace(/(\d{2})\d{5}(\d{4})/, '($1) *****-$2');
  } else if (type === 'email') {
    const [local, domain] = key.split('@');
    return `${local.substring(0, 3)}***@${domain}`;
  }
  return key.substring(0, 10) + '***';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { withdrawal_id } = await req.json();

    console.log('📤 Processando saque:', withdrawal_id);

    // 1. Buscar withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabaseClient
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawal_id)
      .single();

    if (withdrawalError || !withdrawal) {
      throw new Error('Solicitação de saque não encontrada');
    }

    if (withdrawal.status !== 'pending') {
      throw new Error('Esta solicitação já foi processada');
    }

    // 2. Buscar payment settings
    const { data: paymentSettings, error: settingsError } = await supabaseClient
      .from('payment_settings')
      .select('pix_key, pix_key_type')
      .eq('profile_id', withdrawal.profile_id)
      .single();

    if (settingsError || !paymentSettings) {
      throw new Error('Configurações de pagamento não encontradas. Configure sua chave PIX primeiro.');
    }

    if (!paymentSettings.pix_key || !paymentSettings.pix_key_type) {
      throw new Error('Chave PIX não cadastrada');
    }

    // 3. Buscar wallet balance
    const { data: wallet, error: walletError } = await supabaseClient
      .from('freelancer_wallet')
      .select('available_balance')
      .eq('profile_id', withdrawal.profile_id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Carteira não encontrada');
    }

    if (wallet.available_balance < withdrawal.amount) {
      throw new Error('Saldo insuficiente');
    }

    // 4. Atualizar status para processing
    await supabaseClient
      .from('withdrawal_requests')
      .update({ status: 'processing' })
      .eq('id', withdrawal_id);

    // 5. Preparar chamada ao Mercado Pago
    const mercadoPagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    
    if (!mercadoPagoToken) {
      throw new Error('Token do Mercado Pago não configurado');
    }

    console.log('💳 Criando transferência PIX no Mercado Pago...');

    // Criar transferência via Mercado Pago Money Transfer API
    const transferPayload = {
      transaction_amount: withdrawal.amount,
      description: `Saque Woorkins - ${withdrawal.id}`,
      payment_method_id: 'pix',
      payer: {
        email: 'noreply@woorkins.com',
        identification: {
          type: 'CPF',
          number: '00000000000'
        }
      },
      metadata: {
        withdrawal_id: withdrawal.id,
        profile_id: withdrawal.profile_id
      }
    };

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': withdrawal_id
      },
      body: JSON.stringify(transferPayload)
    });

    const mpData = await mpResponse.json();

    console.log('📊 Resposta Mercado Pago:', mpData);

    if (!mpResponse.ok || mpData.status === 'rejected') {
      throw new Error(mpData.message || 'Erro ao processar transferência no Mercado Pago');
    }

    // 6. Atualizar withdrawal como completed
    await supabaseClient
      .from('withdrawal_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        mercadopago_transfer_id: mpData.id?.toString()
      })
      .eq('id', withdrawal_id);

    // 7. Atualizar wallet
    await supabaseClient
      .from('freelancer_wallet')
      .update({
        available_balance: wallet.available_balance - withdrawal.amount,
        total_withdrawn: supabaseClient.rpc('increment_total_withdrawn', {
          wallet_profile_id: withdrawal.profile_id,
          amount: withdrawal.amount
        })
      })
      .eq('profile_id', withdrawal.profile_id);

    // 8. Criar registro de transação
    const maskedKey = maskPixKey(paymentSettings.pix_key, paymentSettings.pix_key_type);
    
    await supabaseClient
      .from('woorkoins_transactions')
      .insert({
        profile_id: withdrawal.profile_id,
        amount: -withdrawal.amount,
        type: 'withdrawal',
        description: `Saque PIX para ${paymentSettings.pix_key_type.toUpperCase()}: ${maskedKey}`,
        metadata: {
          withdrawal_id: withdrawal.id,
          mercadopago_transfer_id: mpData.id,
          pix_key_type: paymentSettings.pix_key_type,
          pix_key_masked: maskedKey
        }
      });

    console.log('✅ Saque processado com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Saque processado com sucesso!',
        transfer_id: mpData.id,
        pix_key_masked: maskedKey
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao processar saque:', error);

    // Tentar atualizar withdrawal como failed
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { withdrawal_id } = await req.json();
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      await supabaseClient
        .from('withdrawal_requests')
        .update({
          status: 'failed',
          error_message: errorMessage
        })
        .eq('id', withdrawal_id);
    } catch (updateError) {
      console.error('Erro ao atualizar status de falha:', updateError);
    }

    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
