import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { withdrawal_id } = await req.json();

    if (!withdrawal_id) {
      throw new Error('withdrawal_id is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing withdrawal:', withdrawal_id);

    // Get withdrawal request details
    const { data: withdrawal, error: withdrawalError } = await supabaseClient
      .from('withdrawal_requests')
      .select('*, profile:profiles(id, full_name, user_id)')
      .eq('id', withdrawal_id)
      .single();

    if (withdrawalError || !withdrawal) {
      throw new Error('Withdrawal request not found');
    }

    if (withdrawal.status !== 'pending') {
      throw new Error(`Withdrawal already ${withdrawal.status}`);
    }

    // Check if user has enough balance
    const { data: wallet } = await supabaseClient
      .from('freelancer_wallet')
      .select('*')
      .eq('profile_id', withdrawal.profile.id)
      .single();

    if (!wallet || wallet.available_balance < withdrawal.amount) {
      throw new Error('Insufficient balance');
    }

    // Update withdrawal status to processing
    await supabaseClient
      .from('withdrawal_requests')
      .update({ 
        status: 'processing',
        processed_at: new Date().toISOString(),
      })
      .eq('id', withdrawal_id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    try {
      // Create a payout via PIX using Stripe
      // NOTE: Stripe PIX payouts in Brazil require specific setup
      // This is a simplified version - real implementation needs Stripe Connect Express setup
      const payout = await stripe.payouts.create({
        amount: Math.round(withdrawal.amount * 100), // Convert to cents
        currency: 'brl',
        method: 'instant', // Instant payout for PIX
        metadata: {
          withdrawal_id: withdrawal_id,
          profile_id: withdrawal.profile.id,
          pix_key: withdrawal.pix_key,
          pix_key_type: withdrawal.pix_key_type,
        },
      });

      console.log('Payout created:', payout.id);

      // Update withdrawal status to completed
      await supabaseClient
        .from('withdrawal_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          stripe_payout_id: payout.id,
        })
        .eq('id', withdrawal_id);

      // Update wallet - subtract from available, add to withdrawn
      await supabaseClient
        .from('freelancer_wallet')
        .update({
          available_balance: wallet.available_balance - withdrawal.amount,
          total_withdrawn: (wallet.total_withdrawn || 0) + withdrawal.amount,
        })
        .eq('profile_id', withdrawal.profile.id);

      // Create transaction record
      await supabaseClient
        .from('transactions')
        .insert({
          user_id: withdrawal.profile.user_id,
          freelancer_profile_id: withdrawal.profile.id,
          type: 'withdrawal',
          amount: withdrawal.amount,
          status: 'completed',
          withdrawal_id: withdrawal_id,
          stripe_payout_id: payout.id,
        });

      // Send notification
      await supabaseClient.from('notifications').insert({
        user_id: withdrawal.profile.id,
        type: 'payment',
        title: 'Saque Processado',
        message: `Seu saque de R$ ${withdrawal.amount.toFixed(2)} foi enviado via PIX!`,
        link: '/payment-settings',
      });

      return new Response(
        JSON.stringify({
          success: true,
          withdrawal_id,
          payout_id: payout.id,
          amount: withdrawal.amount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (stripeError) {
      console.error('Stripe payout error:', stripeError);
      
      // Update withdrawal status to failed
      await supabaseClient
        .from('withdrawal_requests')
        .update({
          status: 'failed',
          error_message: stripeError instanceof Error ? stripeError.message : 'Stripe payout failed',
        })
        .eq('id', withdrawal_id);

      // Notify user
      await supabaseClient.from('notifications').insert({
        user_id: withdrawal.profile.id,
        type: 'payment',
        title: 'Erro no Saque',
        message: 'Houve um problema ao processar seu saque. Entre em contato com o suporte.',
        link: '/payment-settings',
      });

      throw stripeError;
    }
  } catch (error) {
    console.error('Error in process-withdrawal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});