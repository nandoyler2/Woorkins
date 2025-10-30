import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    console.log('🤖 Iniciando verificação de propostas para conclusão automática...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar propostas onde:
    // 1. work_status = 'freelancer_completed'
    // 2. owner_confirmation_deadline passou (é menor que now)
    // 3. escrow ainda não foi liberado
    const { data: proposals, error: fetchError } = await supabaseClient
      .from('proposals')
      .select(`
        id,
        freelancer_id,
        freelancer_amount,
        current_proposal_amount,
        owner_confirmation_deadline,
        project:projects(id, title, profile_id)
      `)
      .eq('work_status', 'freelancer_completed')
      .is('escrow_released_at', null)
      .lt('owner_confirmation_deadline', new Date().toISOString());

    if (fetchError) {
      console.error('❌ Erro ao buscar propostas:', fetchError);
      throw fetchError;
    }

    if (!proposals || proposals.length === 0) {
      console.log('✅ Nenhuma proposta para conclusão automática no momento');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma proposta para conclusão automática',
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Encontradas ${proposals.length} propostas para conclusão automática`);

    const results = [];

    for (const proposal of proposals) {
      try {
        console.log(`🔄 Processando proposta ${proposal.id}...`);

        // 1. Atualizar proposta
        const { error: updateError } = await supabaseClient
          .from('proposals')
          .update({
            work_status: 'completed',
            escrow_released: true,
            escrow_released_at: new Date().toISOString(),
            auto_completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq('id', proposal.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar proposta ${proposal.id}:`, updateError);
          results.push({ proposal_id: proposal.id, success: false, error: updateError.message });
          continue;
        }

        // 2. Atualizar wallet do freelancer
        const { data: wallet, error: walletFetchError } = await supabaseClient
          .from('freelancer_wallet')
          .select('*')
          .eq('profile_id', proposal.freelancer_id)
          .single();

        if (walletFetchError && walletFetchError.code !== 'PGRST116') {
          console.error(`❌ Erro ao buscar wallet:`, walletFetchError);
          results.push({ proposal_id: proposal.id, success: false, error: walletFetchError.message });
          continue;
        }

        if (wallet) {
          const { error: walletUpdateError } = await supabaseClient
            .from('freelancer_wallet')
            .update({
              available_balance: (wallet.available_balance || 0) + proposal.freelancer_amount,
              pending_balance: Math.max(0, (wallet.pending_balance || 0) - proposal.freelancer_amount),
              total_earned: (wallet.total_earned || 0) + proposal.freelancer_amount,
              updated_at: new Date().toISOString(),
            })
            .eq('profile_id', proposal.freelancer_id);

          if (walletUpdateError) {
            console.error(`❌ Erro ao atualizar wallet:`, walletUpdateError);
          } else {
            console.log(`💰 Wallet atualizado: +R$ ${proposal.freelancer_amount} disponível`);
          }
        }

        // 3. Criar histórico
        const project = Array.isArray(proposal.project) ? proposal.project[0] : proposal.project;
        await supabaseClient.from('proposal_status_history').insert({
          proposal_id: proposal.id,
          status_type: 'auto_completed',
          changed_by: project.profile_id,
          new_value: { 
            status: 'completed', 
            auto_completed: true,
            reason: '72h sem confirmação do cliente'
          },
          message: 'Projeto concluído automaticamente após 72h sem confirmação do cliente',
        });

        // 4. Notificar freelancer
        await supabaseClient.from('notifications').insert({
          user_id: proposal.freelancer_id,
          type: 'proposal_completed',
          title: '✅ Projeto Concluído Automaticamente',
          message: `O projeto "${project.title}" foi concluído automaticamente e seu pagamento está disponível!`,
          link: `/financeiro`,
        });

        // 5. Notificar cliente
        await supabaseClient.from('notifications').insert({
          user_id: project.profile_id,
          type: 'proposal_completed',
          title: 'Projeto Concluído',
          message: `O projeto "${project.title}" foi concluído automaticamente após 72h sem confirmação.`,
          link: `/messages?type=proposal&id=${proposal.id}`,
        });

        console.log(`✅ Proposta ${proposal.id} concluída automaticamente com sucesso`);
        results.push({ proposal_id: proposal.id, success: true });

      } catch (error) {
        console.error(`❌ Erro ao processar proposta ${proposal.id}:`, error);
        results.push({ 
          proposal_id: proposal.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro desconhecido' 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Processo concluído: ${successCount}/${proposals.length} propostas finalizadas com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${successCount}/${proposals.length} propostas concluídas automaticamente`,
        results,
        total: proposals.length,
        succeeded: successCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
