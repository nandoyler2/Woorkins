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
    const { proposal_id } = await req.json();

    if (!proposal_id) {
      throw new Error('proposal_id is required');
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

    console.log('Creating payment for proposal:', proposal_id);

    // Get proposal details with freelancer info
    const { data: proposal, error: proposalError } = await supabaseClient
      .from('proposals')
      .select(`
        *,
        freelancer:profiles!proposals_freelancer_id_fkey(id, user_id, full_name),
        business:business_profiles(id, company_name),
        project:projects(id, title, profile_id)
      `)
      .eq('id', proposal_id)
      .single();

    if (proposalError || !proposal) {
      throw new Error('Proposal not found');
    }

    // Verify user is the project owner
    const { data: projectOwner } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('id', proposal.project.profile_id)
      .single();

    if (!projectOwner || projectOwner.user_id !== user.id) {
      throw new Error('Unauthorized: Not the project owner');
    }

    // Get freelancer's Stripe account
    const { data: stripeAccount } = await supabaseClient
      .from('stripe_connected_accounts')
      .select('stripe_account_id, charges_enabled, payouts_enabled')
      .eq('profile_id', proposal.freelancer.id)
      .single();

    if (!stripeAccount || !stripeAccount.charges_enabled) {
      throw new Error('Freelancer has not configured payment settings');
    }

    // Get user's plan
    const { data: userPlan } = await supabaseClient
      .rpc('get_user_plan', { _user_id: user.id });

    const plan = (userPlan as string) || 'free';

    // Calculate fees
    const { data: feesData } = await supabaseClient
      .rpc('calculate_platform_fees', {
        _amount: proposal.budget,
        _plan_type: plan,
      });

    if (!feesData || !Array.isArray(feesData) || feesData.length === 0) {
      throw new Error('Failed to calculate fees');
    }

    const fees = feesData[0] as {
      platform_fee: number;
      stripe_fee: number;
      total_fees: number;
      net_amount: number;
    };

    console.log('Fees calculated:', fees);

    // Create Stripe Payment Intent
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const amount = Math.round(proposal.budget * 100); // Convert to cents
    const applicationFee = Math.round(fees.total_fees * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'brl',
      application_fee_amount: applicationFee,
      on_behalf_of: stripeAccount.stripe_account_id,
      transfer_data: {
        destination: stripeAccount.stripe_account_id,
      },
      capture_method: 'manual', // ESCROW: Don't capture immediately
      payment_method_types: ['card', 'pix'], // Enable Card and PIX
      metadata: {
        proposal_id,
        project_id: proposal.project.id,
        freelancer_id: proposal.freelancer_id,
        user_id: user.id,
        business_id: proposal.business_id || '',
        platform_fee: fees.platform_fee.toString(),
        stripe_fee: fees.stripe_fee.toString(),
        gross_amount: proposal.budget.toString(),
      },
    });

    console.log('Payment Intent created:', paymentIntent.id);

    // Update proposal with payment info
    const { error: updateError } = await supabaseClient
      .from('proposals')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'pending',
        accepted_amount: proposal.budget,
        platform_fee_amount: fees.platform_fee,
        stripe_fee_amount: fees.stripe_fee,
        net_amount: fees.net_amount,
      })
      .eq('id', proposal_id);

    if (updateError) {
      console.error('Error updating proposal:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        amount: proposal.budget,
        platform_fee: fees.platform_fee,
        stripe_fee: fees.stripe_fee,
        net_amount: fees.net_amount,
        total_fees: fees.total_fees,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-project-payment:', error);
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