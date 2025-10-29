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
    const { proposal_id, action } = await req.json();

    if (!proposal_id || !action) {
      throw new Error('proposal_id and action are required');
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

    console.log('Processing release for proposal:', proposal_id, 'action:', action);

    // Get proposal with project info
    const { data: proposal, error: proposalError } = await supabaseClient
      .from('proposals')
      .select(`
        *,
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

    if (action === 'approve') {
      // Capture the payment intent (release from escrow)
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
        apiVersion: '2023-10-16',
      });

      await stripe.paymentIntents.capture(proposal.stripe_payment_intent_id);

      // Update proposal status
      await supabaseClient
        .from('proposals')
        .update({
          work_status: 'completed',
          owner_confirmed_at: new Date().toISOString(),
          escrow_released: true,
          escrow_released_at: new Date().toISOString(),
        })
        .eq('id', proposal_id);

      // Create status history
      await supabaseClient.from('proposal_status_history').insert({
        proposal_id,
        status_type: 'owner_confirmed',
        changed_by: proposal.project.profile_id,
        new_value: { status: 'completed' },
        message: 'Projeto concluído e pagamento liberado!',
      });

      // Notifications are handled by the webhook

      return new Response(
        JSON.stringify({ success: true, message: 'Pagamento liberado com sucesso!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'dispute') {
      // This will be handled by the dispute creation endpoint
      return new Response(
        JSON.stringify({ success: true, message: 'Use o endpoint de criar disputa' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in release-proposal-payment:', error);
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