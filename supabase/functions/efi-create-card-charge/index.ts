import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EFI-CARD] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando criação de cobrança Cartão");

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
    logStep("Usuário autenticado", { userId: user.id });

    const { amount, description, customer, card, installments = 1 } = await req.json();
    logStep("Dados recebidos", { amount, installments });

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

    // Autenticar com Efí
    const authUrl = "https://api.sejaefi.com.br/oauth/token";
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
    const discount = config.efi_card_discount_percent || 0;
    const finalAmount = discount > 0 ? amount * (1 - discount / 100) : amount;

    // Criar cobrança com cartão
    const chargeUrl = "https://api.sejaefi.com.br/v1/charge";
    
    const chargePayload = {
      items: [
        {
          name: description,
          value: Math.round(finalAmount * 100), // Valor em centavos
          amount: 1,
        },
      ],
      payment: {
        credit_card: {
          installments,
          billing_address: {
            street: customer.address?.street || "",
            number: customer.address?.number || "",
            neighborhood: customer.address?.neighborhood || "",
            zipcode: customer.address?.zipcode?.replace(/\D/g, '') || "",
            city: customer.address?.city || "",
            state: customer.address?.state || "",
          },
          payment_token: card.payment_token,
          customer: {
            name: customer.name,
            email: customer.email,
            cpf: customer.document?.replace(/\D/g, ''),
            birth: customer.birth,
            phone_number: customer.phone?.replace(/\D/g, ''),
          },
        },
      },
    };

    logStep("Criando cobrança cartão", { payload: chargePayload });

    const chargeResponse = await fetch(chargeUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chargePayload),
    });

    if (!chargeResponse.ok) {
      const errorText = await chargeResponse.text();
      logStep("Erro ao criar cobrança", { status: chargeResponse.status, error: errorText });
      throw new Error("Falha ao processar pagamento com cartão");
    }

    const chargeData = await chargeResponse.json();
    logStep("Cobrança criada", { chargeId: chargeData.data.charge_id });

    return new Response(
      JSON.stringify({
        charge_id: chargeData.data.charge_id,
        status: chargeData.data.status,
        amount: finalAmount,
        original_amount: amount,
        discount_applied: discount,
        installments,
        total: chargeData.data.total,
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
