import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    const { plan_id } = await req.json();

    console.log('Buy Plan request:', { userId: user.id, plan_id });

    if (!plan_id) {
      throw new Error('Missing plan_id parameter');
    }

    // Get plan details
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      console.error('Plan error:', planError);
      throw new Error('Plan not found');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      throw new Error('Profile not found');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Calculate plan price (monthly subscription)
    const monthlyPrice = 29.90; // Preço base, será ajustado por plano

    // Definir preços dos planos
    const planPrices: Record<string, number> = {
      'basico': 0,      // Grátis
      'prata': 29.90,   // R$ 29,90/mês
      'ouro': 49.90,    // R$ 49,90/mês
      'diamante': 99.90 // R$ 99,90/mês
    };

    const planPrice = planPrices[plan.slug] || 0;

    if (planPrice === 0) {
      throw new Error('Free plan does not require payment');
    }

    // Create Payment Intent for subscription
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(planPrice * 100), // Convert to cents
      currency: 'brl',
      customer: customerId,
      payment_method_types: ['card'],
      metadata: {
        profile_id: profile.id,
        plan_id: plan.id,
        plan_slug: plan.slug,
        type: 'plan_subscription',
      },
    });

    console.log('Payment Intent created:', paymentIntent.id);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        planId: plan.id,
        planName: plan.name,
        planPrice: planPrice,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in buy-plan function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
