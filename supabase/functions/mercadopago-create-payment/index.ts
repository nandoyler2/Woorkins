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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
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
    logStep("Dados recebidos", { 
      paymentMethod, 
      amount, 
      hasToken: !!token,
      hasCard: !!card,
      customer: customer ? { name: customer.name, email: customer.email, hasDocument: !!customer.document } : null
    });

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
    logStep("Token Mercado Pago configurado");
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
    const discount = (paymentMethod === "pix" || paymentMethod === "pix_qr_code")
      ? (config.mercadopago_pix_discount_percent || 0)
      : (config.mercadopago_card_discount_percent || 0);
    const finalAmount = discount > 0 ? amount * (1 - discount / 100) : amount;

    logStep("Valor calculado", { amount, finalAmount, discount });

    // Criar pagamento no Mercado Pago
    const paymentData: any = {
      transaction_amount: finalAmount,
      description: description,
      payment_method_id: paymentMethod === "credit_card" ? "credit_card" : paymentMethod,
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
    if ((paymentMethod === "card" || paymentMethod === "credit_card") && token) {
      logStep("Processando pagamento com cartão", { hasToken: !!token, hasCard: !!card });
      
      paymentData.token = token;
      paymentData.installments = 1; // Padrão 1 parcela
      paymentData.issuer_id = null; // Mercado Pago detecta automaticamente
      
      if (card?.cardholder_name) {
        // Separar nome do titular
        const nameParts = card.cardholder_name.trim().split(' ');
        paymentData.payer.first_name = nameParts[0];
        paymentData.payer.last_name = nameParts.slice(1).join(' ') || nameParts[0];
      }
      
      // Remover payment_method_id quando usar token, o Mercado Pago detecta automaticamente
      delete paymentData.payment_method_id;
      
      logStep("Dados do cartão preparados", { 
        hasToken: !!paymentData.token,
        payerName: `${paymentData.payer.first_name} ${paymentData.payer.last_name}`,
        installments: paymentData.installments
      });
    }

    logStep("Criando pagamento", { paymentData });

    const idempotencyKey = `pix-${user.id}-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Erro ao criar pagamento no Mercado Pago", { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText 
      });
      throw new Error(`Erro Mercado Pago (${response.status}): ${errorText}`);
    }

    const paymentResponse = await response.json();
    logStep("Pagamento criado", { paymentId: paymentResponse.id });

    // Salvar na tabela de pagamentos se for para Woorkoins
    if (woorkoins_amount && woorkoins_price) {
      const paymentStatus = paymentResponse.status === 'approved' ? 'paid' : 'pending';
      
      const { error: insertError } = await supabaseClient
        .from("woorkoins_mercadopago_payments")
        .insert({
          profile_id: profile.id,
          payment_id: paymentResponse.id.toString(),
          payment_method: paymentMethod,
          amount: woorkoins_amount,
          price: finalAmount,
          payment_data: paymentResponse,
          status: paymentStatus,
          paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
        });

      if (insertError) {
        logStep("Erro ao salvar pagamento", insertError);
      }

      // Se cartão aprovado imediatamente, creditar Woorkoins agora
      if (paymentResponse.status === 'approved' || paymentStatus === 'paid') {
        logStep("Pagamento aprovado/pago, creditando Woorkoins", {
          profileId: profile.id,
          amount: woorkoins_amount,
          status: paymentResponse.status,
        });

        const { data: balance } = await supabaseClient
          .from("woorkoins_balance")
          .select("balance")
          .eq("profile_id", profile.id)
          .single();

        if (balance) {
          await supabaseClient
            .from("woorkoins_balance")
            .update({
              balance: balance.balance + woorkoins_amount,
            })
            .eq("profile_id", profile.id);
        } else {
          await supabaseClient
            .from("woorkoins_balance")
            .insert({
              profile_id: profile.id,
              balance: woorkoins_amount,
            });
        }

        await supabaseClient
          .from("woorkoins_transactions")
          .insert({
            profile_id: profile.id,
            type: "purchase",
            amount: woorkoins_amount,
            description: `Compra de ${woorkoins_amount} Woorkoins via Mercado Pago`,
          });

        logStep("Woorkoins creditados com sucesso");
      }
    }

    // Retornar dados de acordo com o método de pagamento
    if (paymentMethod === "pix" || paymentMethod === "pix_qr_code") {
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
    logStep("ERRO GERAL", { 
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
