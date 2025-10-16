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
    const { profileId } = await req.json();

    if (!profileId) {
      throw new Error('profileId é obrigatório');
    }

    console.log('Fixing verification status for profile:', profileId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar a verificação mais recente
    const { data: verification, error: verificationError } = await supabase
      .from('document_verifications')
      .select('verification_status')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verificationError) throw verificationError;

    // Atualizar perfil baseado no status real da verificação
    const shouldBeVerified = verification?.verification_status === 'approved';
    const verificationStatus = verification?.verification_status || 'pending';

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        document_verified: shouldBeVerified,
        document_verification_status: verificationStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId);

    if (updateError) throw updateError;

    console.log('Fixed verification status:', { profileId, shouldBeVerified, verificationStatus });

    return new Response(
      JSON.stringify({ 
        success: true,
        document_verified: shouldBeVerified,
        document_verification_status: verificationStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fixing verification status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
