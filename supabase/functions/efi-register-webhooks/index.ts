import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EFI-REGISTER-WEBHOOKS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando registro de webhooks");

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error('Não autenticado');

    // Verificar se é admin
    const { data: hasAdminRole } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdminRole) {
      throw new Error('Sem permissão de admin');
    }

    // Buscar credenciais
    const clientId = Deno.env.get('EFI_CLIENT_ID');
    const clientSecret = Deno.env.get('EFI_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Credenciais Efí não configuradas');
    }

    // Obter token de acesso
    logStep("Obtendo token de acesso");
    const authString = btoa(`${clientId}:${clientSecret}`);
    const tokenResponse = await fetch('https://api-pix.sejaefi.com.br/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ grant_type: 'client_credentials' })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Erro ao obter token: ${tokenResponse.statusText}`);
    }

    const { access_token } = await tokenResponse.json();
    logStep("Token obtido com sucesso");

    // URL do webhook
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/efi-webhook`;
    logStep("URL do webhook", { url: webhookUrl });

    // Registrar webhook PIX
    logStep("Registrando webhook PIX");
    const pixWebhookResponse = await fetch('https://api-pix.sejaefi.com.br/v2/webhook', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhookUrl: webhookUrl
      })
    });

    if (!pixWebhookResponse.ok) {
      const errorText = await pixWebhookResponse.text();
      logStep("Erro ao registrar webhook PIX", { error: errorText });
      throw new Error(`Erro ao registrar webhook PIX: ${errorText}`);
    }

    logStep("Webhook PIX registrado com sucesso");

    // Registrar webhook de Cobranças (Cartão)
    logStep("Registrando webhook de Cobranças");
    const chargeWebhookResponse = await fetch('https://api.sejaefi.com.br/v1/notification', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notification_url: webhookUrl
      })
    });

    if (!chargeWebhookResponse.ok) {
      const errorText = await chargeWebhookResponse.text();
      logStep("Erro ao registrar webhook de Cobranças", { error: errorText });
      throw new Error(`Erro ao registrar webhook de Cobranças: ${errorText}`);
    }

    logStep("Webhook de Cobranças registrado com sucesso");

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Webhooks registrados com sucesso',
        webhookUrl 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});