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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user } } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if user is admin
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      throw new Error('Admin access required');
    }

    console.log('🔧 Starting wallet values correction...');

    // Get all proposals that have been paid (paid_escrow or released)
    const { data: proposals } = await supabaseClient
      .from('proposals')
      .select(`
        id,
        freelancer_id,
        accepted_amount,
        payment_status,
        freelancer:profiles!proposals_freelancer_id_fkey(id, user_id)
      `)
      .in('payment_status', ['paid_escrow', 'released'])
      .not('accepted_amount', 'is', null);

    if (!proposals) {
      throw new Error('No proposals found');
    }

    console.log(`📊 Found ${proposals.length} paid proposals`);

    // Process each proposal
    const walletUpdates = new Map();

    for (const proposal of proposals) {
      // Get freelancer's user_id from profiles
      const { data: freelancerProfile } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .eq('id', proposal.freelancer_id)
        .single();

      // Get freelancer's plan commission
      const { data: planData } = await supabaseClient
        .from('user_subscription_plans')
        .select('plan_type, subscription_plans(commission_percentage)')
        .eq('user_id', freelancerProfile?.user_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const commissionPercent = (planData?.subscription_plans as any)?.[0]?.commission_percentage || 10;
      const baseAmount = proposal.accepted_amount;
      const platformCommission = Math.round((baseAmount * commissionPercent / 100) * 100) / 100;
      const correctFreelancerAmount = Math.round((baseAmount - platformCommission) * 100) / 100;

      // Update proposal with correct values
      await supabaseClient
        .from('proposals')
        .update({
          freelancer_amount: correctFreelancerAmount,
          platform_commission: platformCommission,
          stripe_processing_fee: 0,
        })
        .eq('id', proposal.id);

      // Accumulate wallet updates
      const profileId = proposal.freelancer_id;
      if (!walletUpdates.has(profileId)) {
        walletUpdates.set(profileId, {
          pendingTotal: 0,
          availableTotal: 0,
          totalEarned: 0,
        });
      }

      const walletData = walletUpdates.get(profileId);
      
      if (proposal.payment_status === 'paid_escrow') {
        walletData.pendingTotal += correctFreelancerAmount;
      } else if (proposal.payment_status === 'released') {
        walletData.availableTotal += correctFreelancerAmount;
        walletData.totalEarned += correctFreelancerAmount;
      }

      console.log(`✅ Proposal ${proposal.id}: R$ ${baseAmount} -> freelancer gets R$ ${correctFreelancerAmount} (${commissionPercent}% commission)`);
    }

    // Update all wallets
    for (const [profileId, totals] of walletUpdates) {
      console.log(`💰 Updating wallet for profile ${profileId}:`, {
        pending: totals.pendingTotal,
        available: totals.availableTotal,
        total_earned: totals.totalEarned
      });

      await supabaseClient
        .from('freelancer_wallet')
        .upsert({
          profile_id: profileId,
          pending_balance: totals.pendingTotal,
          available_balance: totals.availableTotal,
          total_earned: totals.totalEarned,
          total_withdrawn: 0, // Reset, should be recalculated from withdrawal_requests if needed
          updated_at: new Date().toISOString(),
        });
    }

    console.log('🎉 Wallet correction completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Wallet values corrected successfully',
        corrected_proposals: proposals.length,
        corrected_wallets: walletUpdates.size,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fix-wallet-values:', error);
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