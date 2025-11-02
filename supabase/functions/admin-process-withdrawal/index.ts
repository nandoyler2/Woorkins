import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar se é admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roles || roles.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const { withdrawal_id, receipt_url, admin_notes } = await req.json();

    if (!withdrawal_id) {
      throw new Error('withdrawal_id is required');
    }

    console.log('Processing withdrawal:', withdrawal_id);

    // Buscar a solicitação de saque
    const { data: withdrawal, error: withdrawalError } = await supabaseClient
      .from('withdrawal_requests')
      .select(`
        *,
        profiles!inner(id, user_id, full_name)
      `)
      .eq('id', withdrawal_id)
      .single();

    if (withdrawalError || !withdrawal) {
      throw new Error('Withdrawal request not found');
    }

    if (withdrawal.status !== 'pending') {
      throw new Error('Withdrawal is not pending');
    }

    // Buscar perfil do admin
    const { data: adminProfile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!adminProfile) {
      throw new Error('Admin profile not found');
    }

    // Buscar saldo da carteira
    const { data: walletData } = await supabaseClient
      .rpc('get_freelancer_wallet_balance', {
        freelancer_profile_id: withdrawal.profile_id,
      });

    if (!walletData || walletData.length === 0) {
      throw new Error('Wallet not found');
    }

    const wallet = walletData[0];

    if (wallet.available < withdrawal.amount) {
      throw new Error('Insufficient balance');
    }

    // Atualizar status do withdrawal
    const { error: updateWithdrawalError } = await supabaseClient
      .from('withdrawal_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        receipt_url: receipt_url,
        admin_notes: admin_notes,
        processed_by: adminProfile.id,
      })
      .eq('id', withdrawal_id);

    if (updateWithdrawalError) {
      console.error('Error updating withdrawal:', updateWithdrawalError);
      throw new Error('Error updating withdrawal status');
    }

    // Debitar da carteira
    const { error: walletError } = await supabaseClient
      .from('freelancer_wallet')
      .update({
        available_balance: wallet.available - withdrawal.amount,
        total_withdrawn: wallet.withdrawn + withdrawal.amount,
      })
      .eq('profile_id', withdrawal.profile_id);

    if (walletError) {
      console.error('Error updating wallet:', walletError);
      throw new Error('Error updating wallet balance');
    }

    // Criar transação no histórico
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        profile_id: withdrawal.profile_id,
        type: 'withdrawal',
        amount: -withdrawal.amount,
        status: 'completed',
        description: `Saque PIX para ${withdrawal.pix_key_type.toUpperCase()}`,
        receipt_url: receipt_url,
        metadata: {
          withdrawal_id: withdrawal_id,
          pix_key_type: withdrawal.pix_key_type,
          processed_by: adminProfile.id,
        },
      });

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
    }

    // Criar notificação para o usuário
    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: withdrawal.profiles.id,
        type: 'withdrawal_completed',
        title: 'Saque Processado',
        message: `Seu saque de R$ ${withdrawal.amount.toFixed(2)} foi processado com sucesso!`,
        link: '/financeiro',
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    console.log('Withdrawal processed successfully:', withdrawal_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Withdrawal processed successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
