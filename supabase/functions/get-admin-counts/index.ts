import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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
    )

    // Verify user is admin
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || roleData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Execute all counts in parallel for maximum performance
    const [
      moderationResult,
      supportResult,
      verificationResult,
      blocksResult,
      withdrawalsResult,
      pendingProjectsResult,
    ] = await Promise.all([
      supabaseClient
        .from('blocked_messages')
        .select('*', { count: 'exact', head: true }),
      supabaseClient
        .from('support_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabaseClient
        .from('document_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'pending'),
      supabaseClient
        .from('system_blocks')
        .select('*', { count: 'exact', head: true })
        .or('is_permanent.eq.true,blocked_until.gt.now()'),
      supabaseClient
        .from('withdrawal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabaseClient
        .from('pending_projects')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'pending'),
    ])

    const counts = {
      moderation: moderationResult.count || 0,
      support: supportResult.count || 0,
      documentVerifications: verificationResult.count || 0,
      systemBlocks: blocksResult.count || 0,
      withdrawalRequests: withdrawalsResult.count || 0,
      pendingProjects: pendingProjectsResult.count || 0,
    }

    return new Response(JSON.stringify(counts), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching admin counts:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})