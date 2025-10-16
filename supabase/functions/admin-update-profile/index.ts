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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { profileId, userId, data, email } = await req.json();
    
    if (!profileId || !userId) {
      return new Response(
        JSON.stringify({ error: 'profileId e userId são obrigatórios' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Updating profile:', profileId, 'for user:', userId);

    // Validate/prepare update
    const update: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (typeof data?.full_name === 'string') update.full_name = data.full_name.trim();
    if (typeof data?.cpf === 'string') update.cpf = data.cpf.replace(/\D/g, '');
    if (data?.birth_date === '' || data?.birth_date === null) {
      update.birth_date = null;
    } else if (data?.birth_date) {
      update.birth_date = data.birth_date;
    }
    if (typeof data?.location === 'string') update.location = data.location.trim() || null;
    if (typeof data?.bio === 'string') update.bio = data.bio.trim() || null;
    if (typeof data?.filiation === 'string') update.filiation = data.filiation.trim() || null;
    if (typeof data?.nationality === 'string') update.nationality = data.nationality.trim() || null;
    if (typeof data?.place_of_birth === 'string') update.place_of_birth = data.place_of_birth.trim() || null;

    // Handle username change
    if (typeof data?.username === 'string' && data.username.length) {
      const newUsername = data.username.toLowerCase().trim();
      if (RESERVED_USERNAMES.includes(newUsername)) {
        return new Response(
          JSON.stringify({ error: 'Username reservado' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check if username is already taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', newUsername)
        .neq('id', profileId)
        .maybeSingle();
        
      if (existing) {
        return new Response(
          JSON.stringify({ error: 'Username já em uso' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      update.username = newUsername;
      update.last_username_change = new Date().toISOString();
    }

    console.log('Update data:', update);

    // Perform profile update with service role (bypasses RLS)
    const { error: updateError } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', profileId);
      
    if (updateError) {
      console.error('Profile update error:', updateError);
      throw updateError;
    }

    // Update email if provided and different
    if (typeof email === 'string' && email.length && email.includes('@')) {
      const { data: currentUser } = await supabase.auth.admin.getUserById(userId);
      
      if (currentUser?.user?.email !== email) {
        console.log('Updating email from', currentUser?.user?.email, 'to', email);
        const { error: emailError } = await supabase.auth.admin.updateUserById(userId, { 
          email: email 
        });
        
        if (emailError) {
          console.error('Email update error:', emailError);
          throw emailError;
        }
      }
    }

    // Return updated profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    console.log('Profile updated successfully');

    return new Response(
      JSON.stringify({ success: true, profile }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('admin-update-profile error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        details: error 
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
