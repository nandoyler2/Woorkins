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

    // Verify authorization
    if (type === 'proposal') {
      const { data: proposal } = await supabaseClient
        .from('proposals')
        .select('project:projects!inner(profile_id)')
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
    } else {
      const { data: negotiation } = await supabaseClient
        .from('negotiations')
        .select('user_id')
        .eq('stripe_payment_intent_id', payment_intent_id)
        .single();

      if (!negotiation || negotiation.user_id !== user.id) {
        throw new Error('Unauthorized');
      }
    }

    // Capture the payment (release from escrow)
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
        escrow_released: true,
        escrow_released_at: new Date().toISOString(),
        ...(type === 'proposal' && { status: 'completed' }),
        ...(type === 'negotiation' && { status: 'completed', completed_at: new Date().toISOString() }),
      })
      .eq('stripe_payment_intent_id', payment_intent_id);

    if (updateError) {
      console.error('Error updating status:', updateError);
      throw updateError;
    }

    // Send notification
    const message = type === 'proposal' 
      ? 'O pagamento do projeto foi liberado e está sendo transferido para sua conta.'
      : 'O pagamento da negociação foi liberado e está sendo transferido para sua conta.';

    // Get recipient user_id
    let recipientId: string | undefined;
    if (type === 'proposal') {
      const { data: proposal } = await supabaseClient
        .from('proposals')
        .select('freelancer:profiles!proposals_freelancer_id_fkey(user_id)')
        .eq('stripe_payment_intent_id', payment_intent_id)
        .single();
      const freelancerData = proposal?.freelancer as { user_id: string } | undefined;
      recipientId = freelancerData?.user_id;
    } else {
      const { data: negotiation } = await supabaseClient
        .from('negotiations')
        .select('business:business_profiles!inner(profile:profiles!inner(user_id))')
        .eq('stripe_payment_intent_id', payment_intent_id)
        .single();
      const businessData = negotiation?.business as { profile: { user_id: string } } | undefined;
      recipientId = businessData?.profile?.user_id;
    }

    if (recipientId) {
      const { data: recipientProfile } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('user_id', recipientId)
        .single();

      if (recipientProfile) {
        await supabaseClient.from('notifications').insert({
          user_id: recipientProfile.id,
          type: 'payment',
          title: 'Pagamento Liberado',
          message,
          link: type === 'proposal' ? '/my-projects' : '/user/orders',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id,
        status: 'released',
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