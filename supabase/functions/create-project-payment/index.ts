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

    // Verify user is the project owner
    const { data: projectOwner } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('id', proposal.project.profile_id)
      .single();

    if (!projectOwner || projectOwner.user_id !== user.id) {
      throw new Error('Unauthorized: Not the project owner');
    }

    // Calculate payment split (10% commission + Stripe fees)
    const { data: splitData } = await supabaseClient
      .rpc('calculate_payment_split', {
        _amount: proposal.budget,
        _platform_commission_percent: 10,
      });

    if (!splitData || !Array.isArray(splitData) || splitData.length === 0) {
      throw new Error('Failed to calculate payment split');
    }

    const split = splitData[0] as {
      freelancer_amount: number;
      platform_commission: number;
      stripe_fee: number;
      total_amount: number;
    };

    console.log('Payment split calculated:', split);

    // Create Stripe Payment Intent - TODO o dinheiro vai para NOSSA conta
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const amount = Math.round(proposal.budget * 100); // Convert to cents

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
      success_url: `${req.headers.get('origin')}/messages?type=proposal&id=${proposal_id}&payment=success`,
      cancel_url: `${req.headers.get('origin')}/messages?type=proposal&id=${proposal_id}&payment=cancelled`,
      payment_intent_data: {
        capture_method: 'manual',
        metadata: {
          proposal_id,
          project_id: proposal.project.id,
          freelancer_id: proposal.freelancer_id,
          freelancer_profile_id: proposal.freelancer.id,
          user_id: user.id,
          freelancer_amount: split.freelancer_amount.toString(),
          platform_commission: split.platform_commission.toString(),
          stripe_fee: split.stripe_fee.toString(),
          gross_amount: proposal.budget.toString(),
        },
      },
    });

    console.log('Checkout Session created:', session.id);

    // Update proposal with payment info
    const { error: updateError } = await supabaseClient
      .from('proposals')
      .update({
        stripe_payment_intent_id: session.payment_intent as string,
        payment_status: 'pending',
        accepted_amount: proposal.budget,
        freelancer_amount: split.freelancer_amount,
        platform_commission: split.platform_commission,
        stripe_processing_fee: split.stripe_fee,
      })
      .eq('id', proposal_id);

    if (updateError) {
      console.error('Error updating proposal:', updateError);
      throw updateError;
    }

    // Create or update freelancer wallet - adiciona ao pending_balance
    const { data: existingWallet } = await supabaseClient
      .from('freelancer_wallet')
      .select('*')
      .eq('profile_id', proposal.freelancer.id)
      .single();

    if (existingWallet) {
      await supabaseClient
        .from('freelancer_wallet')
        .update({
          pending_balance: (existingWallet.pending_balance || 0) + split.freelancer_amount,
        })
        .eq('profile_id', proposal.freelancer.id);
    } else {
      await supabaseClient
        .from('freelancer_wallet')
        .insert({
          profile_id: proposal.freelancer.id,
          pending_balance: split.freelancer_amount,
          available_balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
        });
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        amount: proposal.budget,
        freelancer_amount: split.freelancer_amount,
        platform_commission: split.platform_commission,
        stripe_fee: split.stripe_fee,
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