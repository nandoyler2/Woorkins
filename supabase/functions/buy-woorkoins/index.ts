import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento dos pacotes para os price_ids do Stripe
const WOORKOINS_PACKAGES: Record<number, string> = {
  100: 'price_1SHtUnJe3Q1gl7R9JAlIIcu6',
  550: 'price_1SHtVMJe3Q1gl7R9ZNOEGA6r',
  1150: 'price_1SHtXQJe3Q1gl7R9AUqS9na9',
  3000: 'price_1SHtXeJe3Q1gl7R9cQ9f7TUQ',
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

    const { amount } = await req.json();

    console.log('Buy Woorkoins request:', { userId: user.id, amount });

    if (!amount) {
      throw new Error('Missing amount parameter');
    }

    // Verificar se existe price_id para este pacote
    const priceId = WOORKOINS_PACKAGES[amount];
    if (!priceId) {
      throw new Error(`Invalid woorkoins package amount: ${amount}`);
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

    // Verificar se o cliente já existe no Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      payment_method_types: ['card', 'boleto'],
      payment_method_options: {
        boleto: {
          expires_after_days: 3,
        },
      },
      success_url: `${req.headers.get('origin')}/woorkoins?payment=success`,
      cancel_url: `${req.headers.get('origin')}/woorkoins?payment=canceled`,
      metadata: {
        profile_id: profile.id,
        woorkoins_amount: amount.toString(),
      },
    });

    console.log('Checkout session created:', session.id);

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in buy-woorkoins function:', error);
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
