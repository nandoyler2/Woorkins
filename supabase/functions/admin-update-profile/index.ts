import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESERVED_USERNAMES = [
  'admin','administrador','suporte','support','moderator','moderacao',
  'sistema','system','woorkins','api','root','sudo','auth','login','logout',
  'signup','signin','register','cadastro','perfil','profile','conta','account',
  'settings','configuracoes','mensagens','messages','projetos','projects','projeto',
  'project','feed','empresa','business','businesses','empresas','painel','dashboard',
  'financeiro','woorkoins','sobre','about','contato','contact','ajuda','help',
  'termos','terms','privacidade','privacy','politica','policy','autenticacao',
  'meus-projetos','editar','edit','novo','new'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticated client to read the caller user
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: authData } = await supabaseAuth.auth.getUser();
    const caller = authData?.user;
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: corsHeaders });
    }

    // Check admin role
    const { data: isAdmin } = await supabaseAuth.rpc('has_role', { _user_id: caller.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403, headers: corsHeaders });
    }

    const { profileId, userId, data, email } = await req.json();
    if (!profileId || !userId) {
      return new Response(JSON.stringify({ error: 'profileId e userId são obrigatórios' }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate/prepare update
    const update: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (typeof data?.full_name === 'string') update.full_name = data.full_name.trim();
    if (typeof data?.cpf === 'string') update.cpf = data.cpf.replace(/\D/g, '');
    if (data?.birth_date === '' || data?.birth_date === null) update.birth_date = null; else if (data?.birth_date) update.birth_date = data.birth_date;
    if (typeof data?.location === 'string') update.location = data.location.trim() || null;
    if (typeof data?.bio === 'string') update.bio = data.bio.trim() || null;
    if (typeof data?.filiation === 'string') update.filiation = data.filiation.trim() || null;
    if (typeof data?.nationality === 'string') update.nationality = data.nationality.trim() || null;
    if (typeof data?.place_of_birth === 'string') update.place_of_birth = data.place_of_birth.trim() || null;

    if (typeof data?.username === 'string' && data.username.length) {
      const newUsername = data.username.toLowerCase();
      if (RESERVED_USERNAMES.includes(newUsername)) {
        return new Response(JSON.stringify({ error: 'Username reservado' }), { status: 400, headers: corsHeaders });
      }
      // Unique check
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', newUsername)
        .not('id', 'eq', profileId)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ error: 'Username já em uso' }), { status: 400, headers: corsHeaders });
      }
      update.username = newUsername;
      update.last_username_change = new Date().toISOString();
    }

    // Perform profile update with service role
    const { error: updateError } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', profileId);
    if (updateError) throw updateError;

    // Update email if provided
    if (typeof email === 'string' && email.length) {
      const { data: current } = await supabase.auth.admin.getUserById(userId);
      if (current?.user?.email !== email) {
        const { error: emailError } = await supabase.auth.admin.updateUserById(userId, { email });
        if (emailError) throw emailError;
      }
    }

    // Return updated row
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    return new Response(JSON.stringify({ success: true, profile }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('admin-update-profile error', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), { status: 500, headers: corsHeaders });
  }
});
