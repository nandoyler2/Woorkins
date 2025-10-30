import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(userError.message);
    const user = userData.user;
    if (!user) throw new Error('Not authenticated');

    // Get profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single();
    if (profileErr || !profile) throw new Error('Profile not found');

    // Get current plan commission
    const { data: planData } = await supabase
      .from('user_subscription_plans')
      .select('plan_type, subscription_plans(commission_percentage)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    const commissionPercent = (planData?.subscription_plans as any)?.[0]?.commission_percentage || 10;

    // Get proposals for this freelancer
    const { data: proposals, error: propErr } = await supabase
      .from('proposals')
      .select('id, accepted_amount, payment_status')
      .eq('freelancer_id', profile.id)
      .in('payment_status', ['paid_escrow', 'released'])
      .not('accepted_amount', 'is', null);
    if (propErr) throw new Error(propErr.message);

    let pendingTotal = 0;
    let availableTotal = 0;
    let totalEarned = 0;

    for (const p of proposals ?? []) {
      const base = Number(p.accepted_amount) || 0;
      const platformCommission = round2(base * commissionPercent / 100);
      const freelancerAmount = round2(base - platformCommission);

      if (p.payment_status === 'paid_escrow') pendingTotal += freelancerAmount;
      if (p.payment_status === 'released') {
        availableTotal += freelancerAmount;
        totalEarned += freelancerAmount;
      }
    }

    // Preserve total_withdrawn if wallet exists
    const { data: wallet } = await supabase
      .from('freelancer_wallet')
      .select('total_withdrawn')
      .eq('profile_id', profile.id)
      .maybeSingle();

    const total_withdrawn = wallet?.total_withdrawn || 0;

    // Upsert wallet
    const { error: upsertErr } = await supabase
      .from('freelancer_wallet')
      .upsert({
        profile_id: profile.id,
        pending_balance: round2(pendingTotal),
        available_balance: round2(availableTotal),
        total_earned: round2(totalEarned),
        total_withdrawn,
        updated_at: new Date().toISOString(),
      });
    if (upsertErr) throw new Error(upsertErr.message);

    return new Response(
      JSON.stringify({
        profile_id: profile.id,
        commission_percent: commissionPercent,
        pending: round2(pendingTotal),
        available: round2(availableTotal),
        total_earned: round2(totalEarned),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('recalculate-my-wallet error', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
