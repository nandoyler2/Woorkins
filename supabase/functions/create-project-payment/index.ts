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

    // Get proposal details
    const { data: proposal, error: proposalError } = await supabaseClient
      .from('proposals')
      .select(`
        *,
        freelancer:profiles!proposals_freelancer_id_fkey(id, user_id, full_name),
        project:projects(id, title, profile_id)
      `)
      .eq('id', proposal_id)
      .single();

    if (proposalError || !proposal) {
      throw new Error('Proposal not found');
    }

    // Verify accepted_amount is set
    if (!proposal.accepted_amount || proposal.accepted_amount <= 0) {
      throw new Error('Accepted amount not defined for this proposal');
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

    // Get freelancer's plan commission percentage
    const { data: planData } = await supabaseClient
      .from('user_subscription_plans')
      .select('plan_type, subscription_plans(commission_percentage)')
      .eq('user_id', proposal.freelancer.user_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const commissionPercent = (planData?.subscription_plans as any)?.[0]?.commission_percentage || 10;
    
    // Calculate payment split (only Woorkins commission, NO Stripe fee deduction from freelancer)
    const baseAmount = proposal.accepted_amount;
    const platformCommission = Math.round((baseAmount * commissionPercent / 100) * 100) / 100;
    const freelancerAmount = Math.round((baseAmount - platformCommission) * 100) / 100;

    console.log('Payment split calculated:', {
      accepted_amount: baseAmount,
      commission_percent: commissionPercent,
      platform_commission: platformCommission,
      freelancer_amount: freelancerAmount
    });

    // Create Stripe Payment Intent - TODO o dinheiro vai para NOSSA conta
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const amount = Math.round(baseAmount * 100); // Convert to cents

    // Criar Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Projeto: ${proposal.project.title}`,
              description: 'Pagamento de proposta',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/mensagens?type=proposal&id=${proposal_id}&payment=success`,
      cancel_url: `${req.headers.get('origin')}/mensagens?type=proposal&id=${proposal_id}&payment=cancelled`,
      payment_intent_data: {
        capture_method: 'manual',
        metadata: {
          proposal_id,
          project_id: proposal.project.id,
          freelancer_id: proposal.freelancer_id,
          freelancer_profile_id: proposal.freelancer.id,
          user_id: user.id,
          freelancer_amount: freelancerAmount.toString(),
          platform_commission: platformCommission.toString(),
          stripe_fee: '0',
          gross_amount: baseAmount.toString(),
        },
      },
    });

    console.log('Checkout Session created:', session.id);

    // Update proposal with payment info (DON'T credit wallet here - only on payment_intent.succeeded)
    const { error: updateError } = await supabaseClient
      .from('proposals')
      .update({
        stripe_payment_intent_id: session.payment_intent as string,
        payment_status: 'pending',
        freelancer_amount: freelancerAmount,
        platform_commission: platformCommission,
        stripe_processing_fee: 0,
      })
      .eq('id', proposal_id);

    if (updateError) {
      console.error('Error updating proposal:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        amount: baseAmount,
        freelancer_amount: freelancerAmount,
        platform_commission: platformCommission,
        stripe_fee: 0,
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