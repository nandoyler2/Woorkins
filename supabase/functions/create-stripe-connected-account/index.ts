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

    console.log('Creating Stripe Connected Account for user:', user.id);

    // Get user's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, username')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Check if account already exists
    const { data: existingAccount } = await supabaseClient
      .from('stripe_connected_accounts')
      .select('stripe_account_id, onboarding_completed')
      .eq('profile_id', profile.id)
      .maybeSingle();

    if (existingAccount) {
      console.log('Stripe account already exists:', existingAccount.stripe_account_id);
      
      // If onboarding not completed, create new onboarding link
      if (!existingAccount.onboarding_completed) {
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
          apiVersion: '2023-10-16',
        });

        const accountLink = await stripe.accountLinks.create({
          account: existingAccount.stripe_account_id,
          refresh_url: `${req.headers.get('origin')}/payment-settings?refresh=true`,
          return_url: `${req.headers.get('origin')}/payment-settings?success=true`,
          type: 'account_onboarding',
        });

        return new Response(
          JSON.stringify({
            account_id: existingAccount.stripe_account_id,
            onboarding_url: accountLink.url,
            existing: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          account_id: existingAccount.stripe_account_id,
          onboarding_completed: true,
          existing: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new Stripe Connected Account
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const account = await stripe.accounts.create({
      type: 'standard',
      country: 'BR',
      email: user.email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        user_id: user.id,
        profile_id: profile.id,
      },
    });

    console.log('Stripe account created:', account.id);

    // Store in database using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: insertError } = await supabaseAdmin
      .from('stripe_connected_accounts')
      .insert({
        profile_id: profile.id,
        stripe_account_id: account.id,
        account_status: 'pending',
        onboarding_completed: false,
      });

    if (insertError) {
      console.error('Error saving to database:', insertError);
      throw insertError;
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get('origin')}/payment-settings?refresh=true`,
      return_url: `${req.headers.get('origin')}/payment-settings?success=true`,
      type: 'account_onboarding',
    });

    console.log('Onboarding link created');

    return new Response(
      JSON.stringify({
        account_id: account.id,
        onboarding_url: accountLink.url,
        existing: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-stripe-connected-account:', error);
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