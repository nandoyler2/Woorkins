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

    // URL do webhook
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/efi-webhook`;
    logStep("URL do webhook", { url: webhookUrl });

    let pixRegistered = false;
    let chargeRegistered = false;

    // Tentar registrar webhook PIX (requer OAuth com certificado mTLS)
    // Este registro provavelmente falhará porque o ambiente Supabase Edge não tem o certificado .p12
    // Isso é esperado e o usuário deve registrar manualmente via Postman/local
    try {
      const { data: cfg } = await supabaseClient
        .from('payment_gateway_config')
        .select('efi_pix_key, efi_validate_mtls')
        .single();

      if (cfg?.efi_pix_key) {
        logStep("Tentando registrar webhook PIX (pode falhar sem certificado)");
        
        // Tenta obter token PIX (requer certificado client-side)
        const pixAuthString = btoa(`${clientId}:${clientSecret}`);
        const pixTokenResp = await fetch('https://pix.api.efipay.com.br/oauth/token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${pixAuthString}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ grant_type: 'client_credentials' })
        });

        if (pixTokenResp.ok) {
          const { access_token: pix_token } = await pixTokenResp.json();
          const skipMtls = cfg.efi_validate_mtls ? 'false' : 'true';
          const pixRegisterUrl = `https://pix.api.efipay.com.br/v2/webhook/${encodeURIComponent(cfg.efi_pix_key)}`;
          
          const pixRegResp = await fetch(pixRegisterUrl, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${pix_token}`,
              'Content-Type': 'application/json',
              'x-skip-mtls-checking': skipMtls,
            },
            body: JSON.stringify({ webhookUrl })
          });

          if (pixRegResp.ok) {
            logStep("Webhook PIX registrado com sucesso");
            pixRegistered = true;
          } else {
            const err = await pixRegResp.text();
            logStep("PIX webhook falhou", { error: err });
          }
        } else {
          logStep("PIX OAuth falhou (esperado sem certificado)", { status: pixTokenResp.status });
        }
      }
    } catch (e) {
      logStep("Erro ao tentar registrar PIX (esperado)", { error: String(e) });
    }

    // Cobranças (Cartão) não possui registro global de webhook: usar notification_url por cobrança
    try {
      logStep("Cobranças não possui registro global de webhook; usar notification_url por transação", { webhookUrl });
      // Não falhar nem tentar endpoint inexistente
      chargeRegistered = false;
    } catch (e) {
      // Por segurança, não propagar erro aqui
      logStep("Aviso: Cobranças não requer registro global de webhook");
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Cobranças: o webhook é definido por cobrança (notification_url).` + (pixRegistered ? ' Webhook PIX registrado com sucesso.' : ' ATENÇÃO: Webhook PIX pode exigir registro manual devido ao mTLS.'),
        webhookUrl,
        pixRegistered,
        chargeRegistered,
        chargeWebhookMode: 'per_charge'
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