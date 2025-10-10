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
    const { payment_intent_id, type } = await req.json();

    if (!payment_intent_id || !type) {
      throw new Error('payment_intent_id and type are required');
    }

    if (!['proposal', 'negotiation'].includes(type)) {
      throw new Error('Invalid type. Must be "proposal" or "negotiation"');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('Releasing payment:', payment_intent_id, 'Type:', type);

    let freelancerProfileId: string | null = null;
    let freelancerAmount: number = 0;

    // Verify authorization and get freelancer info
    if (type === 'proposal') {
      const { data: proposal } = await supabaseClient
        .from('proposals')
        .select('*, project:projects!inner(profile_id), freelancer:profiles!proposals_freelancer_id_fkey(id)')
        .eq('stripe_payment_intent_id', payment_intent_id)
        .single();

      if (!proposal || !proposal.project) {
        throw new Error('Proposal not found');
      }

      const projectData = Array.isArray(proposal.project) ? proposal.project[0] : proposal.project;
      const { data: owner } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .eq('id', projectData.profile_id)
        .single();

      if (!owner || owner.user_id !== user.id) {
        throw new Error('Unauthorized');
      }

      freelancerProfileId = proposal.freelancer.id;
      freelancerAmount = proposal.freelancer_amount || 0;
    } else {
      const { data: negotiation } = await supabaseClient
        .from('negotiations')
        .select('user_id, business_id, final_amount')
        .eq('stripe_payment_intent_id', payment_intent_id)
        .single();

      if (!negotiation || negotiation.user_id !== user.id) {
        throw new Error('Unauthorized');
      }

      // Get business profile_id
      const { data: businessProfile } = await supabaseClient
        .from('business_profiles')
        .select('profile_id')
        .eq('id', negotiation.business_id)
        .single();

      freelancerProfileId = businessProfile?.profile_id || null;
      freelancerAmount = negotiation.final_amount || 0;
    }

    // Capture the payment (release from escrow) na NOSSA conta Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const paymentIntent = await stripe.paymentIntents.capture(payment_intent_id);

    console.log('Payment captured:', paymentIntent.id);

    // Update status
    const table = type === 'proposal' ? 'proposals' : 'negotiations';
    const { error: updateError } = await supabaseClient
      .from(table)
      .update({
        payment_status: 'released',
        payment_captured_at: new Date().toISOString(),
        ...(type === 'proposal' && { status: 'completed' }),
        ...(type === 'negotiation' && { status: 'completed', completed_at: new Date().toISOString() }),
      })
      .eq('stripe_payment_intent_id', payment_intent_id);

    if (updateError) {
      console.error('Error updating status:', updateError);
      throw updateError;
    }

    // Move funds from pending to available in freelancer wallet
    if (freelancerProfileId && freelancerAmount > 0) {
      const { data: wallet } = await supabaseClient
        .from('freelancer_wallet')
        .select('*')
        .eq('profile_id', freelancerProfileId)
        .single();

      if (wallet) {
        await supabaseClient
          .from('freelancer_wallet')
          .update({
            available_balance: (wallet.available_balance || 0) + freelancerAmount,
            pending_balance: Math.max(0, (wallet.pending_balance || 0) - freelancerAmount),
            total_earned: (wallet.total_earned || 0) + freelancerAmount,
          })
          .eq('profile_id', freelancerProfileId);

        // Send notification
        await supabaseClient.from('notifications').insert({
          user_id: freelancerProfileId,
          type: 'payment',
          title: 'Pagamento Disponível',
          message: `Você tem R$ ${freelancerAmount.toFixed(2)} disponível para saque!`,
          link: '/payment-settings',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id,
        status: 'released',
        available_for_withdrawal: freelancerAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in release-payment:', error);
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