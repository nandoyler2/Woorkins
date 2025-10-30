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
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret!);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle payment_intent.succeeded
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const proposalId = paymentIntent.metadata.proposal_id;

      if (!proposalId) {
        console.log('No proposal_id in metadata, skipping');
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      console.log('Processing payment for proposal:', proposalId);

      // Get proposal to check if already processed
      const { data: proposal } = await supabase
        .from('proposals')
        .select('*, freelancer:profiles!proposals_freelancer_id_fkey(id, user_id)')
        .eq('id', proposalId)
        .single();

      if (!proposal) {
        console.error('Proposal not found:', proposalId);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      // IDEMPOTENCY: Skip if already processed
      if (proposal.payment_status === 'paid_escrow' || proposal.payment_status === 'in_progress') {
        console.log('⚠️ Proposal payment already processed:', proposalId);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      // Recalculate with correct commission (only Woorkins fee)
      const { data: planData } = await supabase
        .from('user_subscription_plans')
        .select('plan_type, subscription_plans(commission_percentage)')
        .eq('user_id', proposal.freelancer.user_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const commissionPercent = (planData?.subscription_plans as any)?.[0]?.commission_percentage || 10;
      const baseAmount = proposal.accepted_amount || parseFloat(paymentIntent.metadata.gross_amount);
      const platformCommission = Math.round((baseAmount * commissionPercent / 100) * 100) / 100;
      const freelancerAmount = Math.round((baseAmount - platformCommission) * 100) / 100;

      console.log('✅ Recalculated payment split:', {
        accepted_amount: baseAmount,
        commission_percent: commissionPercent,
        platform_commission: platformCommission,
        freelancer_amount: freelancerAmount
      });

      // Update proposal status with correct values
      const { error: updateError } = await supabase
        .from('proposals')
        .update({
          payment_status: 'paid_escrow',
          work_status: 'in_progress',
          paid_at: new Date().toISOString(),
          freelancer_amount: freelancerAmount,
          platform_commission: platformCommission,
          stripe_processing_fee: 0,
        })
        .eq('id', proposalId);

      if (updateError) {
        console.error('Error updating proposal:', updateError);
        throw updateError;
      }

      // Credit pending balance (ONLY ONCE)
      const { data: existingWallet } = await supabase
        .from('freelancer_wallet')
        .select('*')
        .eq('profile_id', proposal.freelancer_id)
        .single();

      if (existingWallet) {
        await supabase
          .from('freelancer_wallet')
          .update({
            pending_balance: (existingWallet.pending_balance || 0) + freelancerAmount,
          })
          .eq('profile_id', proposal.freelancer_id);
      } else {
        await supabase
          .from('freelancer_wallet')
          .insert({
            profile_id: proposal.freelancer_id,
            pending_balance: freelancerAmount,
            available_balance: 0,
            total_earned: 0,
            total_withdrawn: 0,
          });
      }

      // Create status history entry
      await supabase.from('proposal_status_history').insert({
        proposal_id: proposalId,
        status_type: 'payment_made',
        changed_by: paymentIntent.metadata.user_id,
        new_value: { amount: baseAmount },
        message: 'Pagamento confirmado! Projeto iniciado.',
      });

      // Get profiles for notifications
      const { data: proposalData } = await supabase
        .from('proposals')
        .select(`
          freelancer_id,
          project:projects!inner(id, title, profile_id)
        `)
        .eq('id', proposalId)
        .single();

      if (proposalData && proposalData.project) {
        const project = Array.isArray(proposalData.project) ? proposalData.project[0] : proposalData.project;
        
        // Notify freelancer
        await supabase.from('notifications').insert({
          user_id: proposalData.freelancer_id,
          type: 'payment',
          title: 'Pagamento recebido',
          message: `O pagamento do projeto "${project.title}" foi confirmado!`,
          link: `/mensagens?type=proposal&id=${proposalId}`,
        });

        // Notify project owner
        await supabase.from('notifications').insert({
          user_id: project.profile_id,
          type: 'payment',
          title: 'Pagamento confirmado',
          message: `Seu pagamento foi confirmado e o projeto "${project.title}" foi iniciado!`,
          link: `/mensagens?type=proposal&id=${proposalId}`,
        });
      }

      console.log('Proposal payment processed successfully');
    }

    // Handle charge.captured (for escrow release)
    if (event.type === 'charge.captured') {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent;

      const { data: proposal } = await supabase
        .from('proposals')
        .select('id, freelancer_id, freelancer_amount, payment_status')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (proposal) {
        console.log('Processing escrow release for proposal:', proposal.id);

        // IDEMPOTENCY: Skip if already released
        if (proposal.payment_status === 'released') {
          console.log('⚠️ Proposal escrow already released:', proposal.id);
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: corsHeaders,
          });
        }

        // Update wallet - move from pending to available (ONLY ONCE)
        const { data: wallet } = await supabase
          .from('freelancer_wallet')
          .select('*')
          .eq('profile_id', proposal.freelancer_id)
          .single();

        if (wallet) {
          const newAvailable = (wallet.available_balance || 0) + proposal.freelancer_amount;
          const newPending = Math.max((wallet.pending_balance || 0) - proposal.freelancer_amount, 0);
          const newTotalEarned = (wallet.total_earned || 0) + proposal.freelancer_amount;

          console.log('💰 Releasing escrow:', {
            proposal_id: proposal.id,
            releasing: proposal.freelancer_amount,
            new_available: newAvailable,
            new_pending: newPending,
            new_total: newTotalEarned
          });

          await supabase
            .from('freelancer_wallet')
            .update({
              pending_balance: newPending,
              available_balance: newAvailable,
              total_earned: newTotalEarned,
            })
            .eq('profile_id', proposal.freelancer_id);
        }

        // Update proposal
        await supabase
          .from('proposals')
          .update({
            payment_status: 'released',
            payment_captured_at: new Date().toISOString(),
          })
          .eq('id', proposal.id);

        // Notify freelancer
        await supabase.from('notifications').insert({
          user_id: proposal.freelancer_id,
          type: 'payment',
          title: 'Pagamento liberado',
          message: 'O pagamento do projeto foi liberado para sua carteira!',
          link: '/financeiro',
        });

        console.log('Escrow released successfully');
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Error in webhook handler:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});