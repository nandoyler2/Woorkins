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
    const { negotiation_id } = await req.json();

    if (!negotiation_id) {
      throw new Error('negotiation_id is required');
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

    console.log('Creating payment for negotiation:', negotiation_id);

    // Get negotiation details with business info
    const { data: negotiation, error: negotiationError } = await supabaseClient
      .from('negotiations')
      .select('*, business:business_profiles(id, company_name, profile_id)')
      .eq('id', negotiation_id)
      .single();

    if (negotiationError || !negotiation) {
      throw new Error('Negotiation not found');
    }

    // Verify user is the negotiation owner
    if (negotiation.user_id !== user.id) {
      throw new Error('Unauthorized: Not the negotiation owner');
    }

    if (!negotiation.final_amount || negotiation.final_amount <= 0) {
      throw new Error('Final amount not set');
    }

    // Calculate payment split (10% commission + Stripe fees)
    const { data: splitData } = await supabaseClient
      .rpc('calculate_payment_split', {
        _amount: negotiation.final_amount,
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

    const amount = Math.round(negotiation.final_amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'brl',
      capture_method: 'manual', // ESCROW
      payment_method_types: ['card', 'pix'],
      metadata: {
        negotiation_id,
        business_id: negotiation.business_id,
        business_profile_id: negotiation.business.profile_id,
        user_id: user.id,
        freelancer_amount: split.freelancer_amount.toString(),
        platform_commission: split.platform_commission.toString(),
        stripe_fee: split.stripe_fee.toString(),
        gross_amount: negotiation.final_amount.toString(),
      },
    });

    console.log('Payment Intent created:', paymentIntent.id);

    // Update negotiation with payment info
    const { error: updateError } = await supabaseClient
      .from('negotiations')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'pending',
      })
      .eq('id', negotiation_id);

    if (updateError) {
      console.error('Error updating negotiation:', updateError);
      throw updateError;
    }

    // Create or update business wallet - adiciona ao pending_balance
    const { data: existingWallet } = await supabaseClient
      .from('freelancer_wallet')
      .select('*')
      .eq('profile_id', negotiation.business.profile_id)
      .single();

    if (existingWallet) {
      await supabaseClient
        .from('freelancer_wallet')
        .update({
          pending_balance: (existingWallet.pending_balance || 0) + split.freelancer_amount,
        })
        .eq('profile_id', negotiation.business.profile_id);
    } else {
      await supabaseClient
        .from('freelancer_wallet')
        .insert({
          profile_id: negotiation.business.profile_id,
          pending_balance: split.freelancer_amount,
          available_balance: 0,
          total_earned: 0,
          total_withdrawn: 0,
        });
    }

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        amount: negotiation.final_amount,
        freelancer_amount: split.freelancer_amount,
        platform_commission: split.platform_commission,
        stripe_fee: split.stripe_fee,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-negotiation-payment:', error);
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