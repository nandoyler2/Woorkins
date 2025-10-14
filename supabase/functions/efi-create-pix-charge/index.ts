import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EFI-PIX] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando criação de cobrança PIX");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header missing");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("Usuário autenticado", { userId: user.id, email: user.email });

    const { amount, description, customer, woorkoins_amount, woorkoins_price } = await req.json();
    logStep("Dados recebidos", { amount, description, customer, woorkoins_amount, woorkoins_price });

    // Buscar profile_id do usuário
    const { data: profileData, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    
    if (profileError || !profileData) {
      throw new Error("Perfil do usuário não encontrado");
    }

    // Buscar configurações do Efí
    const { data: config, error: configError } = await supabaseClient
      .from("payment_gateway_config")
      .select("*")
      .single();

    if (configError || !config?.efi_enabled) {
      throw new Error("Efí Pay não está configurado ou ativo");
    }
    logStep("Configuração Efí carregada");

    // Obter credenciais
    const clientId = Deno.env.get("EFI_CLIENT_ID");
    const clientSecret = Deno.env.get("EFI_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      throw new Error("Credenciais Efí não configuradas");
    }

    // Autenticar com Efí (API PIX - requer certificado mTLS)
    // NOTA: Em ambiente Supabase Edge, pode falhar sem certificado client-side
    const authUrl = "https://pix.api.efipay.com.br/oauth/token";
    const authResponse = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
      }),
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      logStep("Erro na autenticação Efí", { status: authResponse.status, error: errorText });
      throw new Error("Falha na autenticação com Efí Pay");
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;
    logStep("Token de acesso obtido");

    // Calcular desconto se aplicável
    const discount = config.efi_pix_discount_percent || 0;
    const finalAmount = discount > 0 ? amount * (1 - discount / 100) : amount;

    // Calcular expiracao
    const expirationSeconds = (config.efi_pix_expiration_hours || 24) * 3600;

    // Criar cobrança PIX (API PIX)
    const txid = crypto.randomUUID().replace(/-/g, '');
    const pixUrl = `https://pix.api.efipay.com.br/v2/cob/${txid}`;
    
    const pixPayload = {
      calendario: {
        expiracao: expirationSeconds,
      },
      devedor: {
        nome: customer.name,
        cpf: customer.document?.replace(/\D/g, ''),
      },
      valor: {
        original: finalAmount.toFixed(2),
      },
      chave: config.efi_pix_key,
      solicitacaoPagador: description,
    };

    logStep("Criando cobrança PIX", { txid, payload: pixPayload });

    const pixResponse = await fetch(pixUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pixPayload),
    });

    if (!pixResponse.ok) {
      const errorText = await pixResponse.text();
      logStep("Erro ao criar cobrança PIX", { status: pixResponse.status, error: errorText });
      throw new Error("Falha ao criar cobrança PIX");
    }

    const pixData = await pixResponse.json();
    logStep("Cobrança PIX criada", { txid, location: pixData.location });

    // Gerar QR Code (API PIX)
    const qrCodeUrl = `https://pix.api.efipay.com.br/v2/loc/${pixData.loc}/qrcode`;
    const qrCodeResponse = await fetch(qrCodeUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!qrCodeResponse.ok) {
      logStep("Erro ao gerar QR Code", { status: qrCodeResponse.status });
      throw new Error("Falha ao gerar QR Code");
    }

    const qrCodeData = await qrCodeResponse.json();
    logStep("QR Code gerado");

    // Se for compra de Woorkoins, salvar na tabela de pagamentos
    if (woorkoins_amount && woorkoins_price) {
      const { error: insertError } = await supabaseClient
        .from("woorkoins_efi_payments")
        .insert({
          profile_id: profileData.id,
          charge_id: txid,
          payment_method: 'pix',
          amount: woorkoins_amount,
          price: woorkoins_price,
          status: 'pending',
          efi_charge_data: { ...pixData, qrCodeData },
        });

      if (insertError) {
        logStep("ERRO ao salvar pagamento Woorkoins", insertError);
        throw new Error("Falha ao registrar pagamento de Woorkoins");
      }
      logStep("Pagamento Woorkoins registrado", { txid, profile_id: profileData.id });
    }

    return new Response(
      JSON.stringify({
        txid,
        qrcode: qrCodeData.qrcode,
        qrcode_image: qrCodeData.imagemQrcode,
        amount: finalAmount,
        original_amount: amount,
        discount_applied: discount,
        expires_at: new Date(Date.now() + expirationSeconds * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
