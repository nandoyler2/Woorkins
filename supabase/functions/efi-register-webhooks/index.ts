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

    // Registrar webhook de Cobranças (Cartão) - este deve funcionar
    try {
      logStep("Obtendo token para Cobranças");

      const chargeAuthString = btoa(`${clientId}:${clientSecret}`);

      const tryAuthorize = async (baseUrl: string) => {
        const resp = await fetch(`${baseUrl}/v1/authorize`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${chargeAuthString}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ grant_type: 'client_credentials' })
        });
        return resp;
      };

      // 1) Tenta produção
      const prodBase = 'https://cobrancas.api.efipay.com.br';
      let envUsed = 'production';
      let chargeTokenResp = await tryAuthorize(prodBase);

      // 2) Se 401, tenta homologação automaticamente
      if (chargeTokenResp.status === 401) {
        logStep('Token Cobranças 401 em produção, tentando homologação...');
        const homologBase = 'https://cobrancas-h.api.efipay.com.br';
        const tryResp = await tryAuthorize(homologBase);
        if (!tryResp.ok) {
          const errText = await tryResp.text();
          logStep('ERRO ao obter token de Cobranças (homologação)', { status: tryResp.status, error: errText });
          throw new Error(`Erro ao obter token de Cobranças (homologação): ${tryResp.status} - ${errText}`);
        }
        chargeTokenResp = tryResp;
        envUsed = 'homolog';
      }

      if (!chargeTokenResp.ok) {
        const errText = await chargeTokenResp.text();
        throw new Error(`Erro ao obter token de Cobranças: ${chargeTokenResp.status} - ${errText}`);
      }

      const { access_token } = await chargeTokenResp.json();
      logStep(`Token de Cobranças obtido (${envUsed})`);

      // Registrar webhook usando a mesma base utilizada na autorização
      logStep("Registrando webhook de Cobranças");
      const baseForWebhook = envUsed === 'homolog' ? 'https://cobrancas-h.api.efipay.com.br' : 'https://cobrancas.api.efipay.com.br';
      const chargeWebhookResp = await fetch(`${baseForWebhook}/v1/notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notification_url: webhookUrl })
      });

      if (!chargeWebhookResp.ok) {
        const errText = await chargeWebhookResp.text();
        throw new Error(`Erro ao registrar webhook de Cobranças (${envUsed}): ${errText}`);
      }

      logStep("Webhook de Cobranças registrado com sucesso", { env: envUsed });
      chargeRegistered = true;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      logStep("ERRO ao registrar Cobranças", { error: errMsg });
      throw new Error(`Falha no registro de webhook de Cobranças: ${errMsg}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: chargeRegistered 
          ? 'Webhook de Cobranças registrado com sucesso!' + (pixRegistered ? ' Webhook PIX também registrado.' : ' ATENÇÃO: Webhook PIX deve ser registrado manualmente (veja documentação).')
          : 'Erro ao registrar webhooks',
        webhookUrl,
        pixRegistered,
        chargeRegistered
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