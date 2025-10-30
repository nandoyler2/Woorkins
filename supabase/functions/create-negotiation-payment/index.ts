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

    // Get target profile's plan commission percentage
    const { data: targetProfile } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('id', negotiation.target_profile_id)
      .single();

    if (!targetProfile) {
      throw new Error('Target profile not found');
    }

    const { data: planData } = await supabaseClient
      .from('user_subscription_plans')
      .select('plan_type, subscription_plans(commission_percentage)')
      .eq('user_id', targetProfile.user_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const commissionPercent = (planData?.subscription_plans as any)?.[0]?.commission_percentage || 10;
    
    // Calculate payment split (only Woorkins commission, NO Stripe fee deduction from freelancer)
    const baseAmount = negotiation.final_amount;
    const platformCommission = Math.round((baseAmount * commissionPercent / 100) * 100) / 100;
    const freelancerAmount = Math.round((baseAmount - platformCommission) * 100) / 100;

    console.log('Payment split calculated:', {
      final_amount: baseAmount,
      commission_percent: commissionPercent,
      platform_commission: platformCommission,
      freelancer_amount: freelancerAmount
    });

    // Create Stripe Payment Intent - TODO o dinheiro vai para NOSSA conta
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const amount = Math.round(baseAmount * 100);

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
        freelancer_amount: freelancerAmount.toString(),
        platform_commission: platformCommission.toString(),
        stripe_fee: '0',
        gross_amount: baseAmount.toString(),
      },
    });

    console.log('Payment Intent created:', paymentIntent.id);

    // Update negotiation with payment info (DON'T credit wallet here - only on payment_intent.succeeded)
    const { error: updateError } = await supabaseClient
      .from('negotiations')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'pending',
        freelancer_amount: freelancerAmount,
        platform_commission: platformCommission,
        stripe_processing_fee: 0,
      })
      .eq('id', negotiation_id);

    if (updateError) {
      console.error('Error updating negotiation:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        amount: baseAmount,
        freelancer_amount: freelancerAmount,
        platform_commission: platformCommission,
        stripe_fee: 0,
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