import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchQuery } = await req.json();

    if (!searchQuery || searchQuery.length < 2) {
      return new Response(
        JSON.stringify({ users: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching users by email:', searchQuery);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar usuários por email usando admin API
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) throw authError;

    // Filtrar usuários cujo email contém o termo de busca (case insensitive)
    const matchingUsers = authUsers.users.filter(user => 
      user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Buscar os profiles correspondentes
    const userIds = matchingUsers.map(u => u.id);
    
    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ users: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('user_id', userIds)
      .limit(10);

    if (profileError) throw profileError;

    console.log('Found profiles:', profiles?.length);

    return new Response(
      JSON.stringify({ 
        success: true,
        users: profiles || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error searching users by email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
