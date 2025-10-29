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

      // Update proposal status
      const { error: updateError } = await supabase
        .from('proposals')
        .update({
          payment_status: 'paid_escrow',
          work_status: 'in_progress',
          paid_at: new Date().toISOString(),
        })
        .eq('id', proposalId);

      if (updateError) {
        console.error('Error updating proposal:', updateError);
        throw updateError;
      }

      // Get proposal data to update wallet
      const { data: proposal } = await supabase
        .from('proposals')
        .select('freelancer_id, freelancer_amount')
        .eq('id', proposalId)
        .single();

      if (proposal) {
        // Update or create freelancer wallet
        const { data: existingWallet } = await supabase
          .from('freelancer_wallet')
          .select('*')
          .eq('profile_id', proposal.freelancer_id)
          .single();

        if (existingWallet) {
          await supabase
            .from('freelancer_wallet')
            .update({
              pending_balance: (existingWallet.pending_balance || 0) + proposal.freelancer_amount,
            })
            .eq('profile_id', proposal.freelancer_id);
        } else {
          await supabase
            .from('freelancer_wallet')
            .insert({
              profile_id: proposal.freelancer_id,
              pending_balance: proposal.freelancer_amount,
              available_balance: 0,
              total_earned: 0,
              total_withdrawn: 0,
            });
        }
      }

      // Create status history entry
      await supabase.from('proposal_status_history').insert({
        proposal_id: proposalId,
        status_type: 'payment_made',
        changed_by: paymentIntent.metadata.user_id,
        new_value: { amount: paymentIntent.amount / 100 },
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
          link: `/messages?type=proposal&id=${proposalId}`,
        });

        // Notify project owner
        await supabase.from('notifications').insert({
          user_id: project.profile_id,
          type: 'payment',
          title: 'Pagamento confirmado',
          message: `Seu pagamento foi confirmado e o projeto "${project.title}" foi iniciado!`,
          link: `/messages?type=proposal&id=${proposalId}`,
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
        .select('id, freelancer_id, freelancer_amount')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (proposal) {
        console.log('Processing escrow release for proposal:', proposal.id);

        // Update wallet - move from pending to available
        const { data: wallet } = await supabase
          .from('freelancer_wallet')
          .select('*')
          .eq('profile_id', proposal.freelancer_id)
          .single();

        if (wallet) {
          await supabase
            .from('freelancer_wallet')
            .update({
              pending_balance: (wallet.pending_balance || 0) - proposal.freelancer_amount,
              available_balance: (wallet.available_balance || 0) + proposal.freelancer_amount,
              total_earned: (wallet.total_earned || 0) + proposal.freelancer_amount,
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