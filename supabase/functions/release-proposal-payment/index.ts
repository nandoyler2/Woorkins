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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const supabaseAuthClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );
      
      const { data: { user } } = await supabaseAuthClient.auth.getUser();
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

      // Verificar se o pagamento já foi liberado
      if (proposal.payment_status === 'released') {
        console.log('⚠️ Payment already released for this proposal');
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'O pagamento já foi liberado para esta proposta',
            already_processed: true 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (action === 'approve') {
        console.log('🚀 Starting balance release process (pending → available)...');

        // Update proposal status
        console.log('📝 Updating proposal status...');
        const { error: proposalError } = await supabaseClient
          .from('proposals')
          .update({
            work_status: 'completed',
            payment_status: 'released',
            owner_confirmed_at: new Date().toISOString(),
            escrow_released_at: new Date().toISOString(),
          })
          .eq('id', proposal_id);

        if (proposalError) {
          console.error('❌ Error updating proposal:', proposalError);
          throw new Error('Falha ao atualizar proposta: ' + proposalError.message);
        }
        console.log('✅ Proposal status updated successfully');

        // Move freelancer payment from pending to available
        console.log('💰 Updating freelancer wallet...');
        const { data: wallet, error: walletFetchError } = await supabaseClient
          .from('freelancer_wallet')
          .select('*')
          .eq('profile_id', proposal.freelancer_id)
          .single();

        if (walletFetchError) {
          console.error('❌ Error fetching wallet:', walletFetchError);
          throw new Error('Falha ao buscar carteira: ' + walletFetchError.message);
        }

        if (wallet) {
          const newAvailable = (wallet.available_balance || 0) + proposal.freelancer_amount;
          const newPending = Math.max((wallet.pending_balance || 0) - proposal.freelancer_amount, 0);
          
          console.log('📊 Balance transfer (pending → available):', {
            available: `${wallet.available_balance} → ${newAvailable}`,
            pending: `${wallet.pending_balance} → ${newPending}`,
            total_earned: `${wallet.total_earned} (unchanged)`
          });

          const { error: walletError } = await supabaseClient
            .from('freelancer_wallet')
            .update({
              available_balance: newAvailable,
              pending_balance: newPending,
              updated_at: new Date().toISOString(),
            })
            .eq('profile_id', proposal.freelancer_id);

          if (walletError) {
            console.error('❌ Error updating wallet:', walletError);
            throw new Error('Falha ao atualizar carteira: ' + walletError.message);
          }
          console.log('✅ Wallet updated successfully');
        }

        // Create status history with 'completed' type
        console.log('📜 Creating status history...');
        const { error: historyError } = await supabaseClient.from('proposal_status_history').insert({
          proposal_id,
          status_type: 'completed',
          changed_by: proposal.project.profile_id,
          new_value: { status: 'completed' },
          message: 'Projeto concluído e pagamento liberado!',
        });

        if (historyError) {
          console.error('❌ Error creating status history:', historyError);
          throw new Error('Falha ao criar histórico: ' + historyError.message);
        }
        console.log('✅ Status history created successfully');

        console.log('🎉 Balance release completed successfully!');
        return new Response(
          JSON.stringify({ success: true, message: 'Saldo liberado com sucesso!' }),
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
    } else {
      throw new Error('No authorization header');
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
