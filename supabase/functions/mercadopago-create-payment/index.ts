import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MERCADOPAGO] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando criação de pagamento Mercado Pago");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header missing");

    const authToken = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(authToken);
    if (userError) throw userError;

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("Usuário autenticado", { userId: user.id });

    const { paymentMethod, amount, description, customer, woorkoins_amount, woorkoins_price, token, card } = await req.json();
    logStep("Dados recebidos", { paymentMethod, amount, hasToken: !!token });

    // Buscar configurações do Mercado Pago
    const { data: config, error: configError } = await supabaseClient
      .from("payment_gateway_config")
      .select("*")
      .single();

    if (configError || !config?.mercadopago_enabled) {
      throw new Error("Mercado Pago não está configurado ou ativo");
    }
    logStep("Configuração Mercado Pago carregada");

    // Obter token de acesso
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("Token de acesso Mercado Pago não configurado");
    }

    // Buscar profile_id do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Perfil do usuário não encontrado");
    }
    logStep("Profile encontrado", { profileId: profile.id });

    // Calcular desconto se aplicável
    const discount = paymentMethod === "pix" 
      ? (config.mercadopago_pix_discount_percent || 0)
      : (config.mercadopago_card_discount_percent || 0);
    const finalAmount = discount > 0 ? amount * (1 - discount / 100) : amount;

    logStep("Valor calculado", { amount, finalAmount, discount });

    // Criar pagamento no Mercado Pago
    const paymentData: any = {
      transaction_amount: finalAmount,
      description: description,
      payment_method_id: paymentMethod,
      payer: {
        email: customer.email,
        ...(customer.name && {
          first_name: customer.name.split(' ')[0],
          last_name: customer.name.split(' ').slice(1).join(' ') || customer.name.split(' ')[0]
        }),
        ...(customer.document && {
          identification: {
            type: customer.document.length === 11 ? "CPF" : "CNPJ",
            number: customer.document
          }
        })
      },
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
    };

    // Se for cartão, adicionar token e dados do cartão
    if (paymentMethod === "card" && token) {
      paymentData.token = token;
      if (card?.cardholder_name) {
        paymentData.payer.name = card.cardholder_name;
      }
    }

    logStep("Criando pagamento", { paymentData });

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Erro ao criar pagamento", { status: response.status, error: errorText });
      throw new Error(`Erro ao processar pagamento: ${errorText}`);
    }

    const paymentResponse = await response.json();
    logStep("Pagamento criado", { paymentId: paymentResponse.id });

    // Salvar na tabela de pagamentos para Woorkoins
    const { error: insertError } = await supabaseClient
      .from("woorkoins_mercadopago_payments")
      .insert({
        profile_id: profile.id,
        payment_id: paymentResponse.id.toString(),
        payment_method: paymentMethod,
        amount: woorkoins_amount,
        price: finalAmount,
        payment_data: paymentResponse,
        status: 'pending',
      });

    if (insertError) {
      logStep("Erro ao salvar pagamento", insertError);
    }

    // Retornar dados de acordo com o método de pagamento
    if (paymentMethod === "pix") {
      return new Response(
        JSON.stringify({
          payment_id: paymentResponse.id,
          qrcode: paymentResponse.point_of_interaction.transaction_data.qr_code,
          qrcode_base64: paymentResponse.point_of_interaction.transaction_data.qr_code_base64,
          amount: finalAmount,
          original_amount: amount,
          discount_applied: discount,
          expires_at: paymentResponse.date_of_expiration,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Para cartão, retornar link de pagamento ou dados necessários
      return new Response(
        JSON.stringify({
          payment_id: paymentResponse.id,
          status: paymentResponse.status,
          amount: finalAmount,
          original_amount: amount,
          discount_applied: discount,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
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
