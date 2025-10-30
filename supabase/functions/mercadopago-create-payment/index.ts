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

    const { paymentMethod, amount, description, customer, woorkoins_amount, woorkoins_price, token, card, proposal_id } = await req.json();
    logStep("Dados recebidos", { 
      paymentMethod, 
      amount, 
      hasToken: !!token,
      hasCard: !!card,
      proposalId: proposal_id,
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

    // Se for pagamento de proposta
    if (proposal_id) {
      const paymentStatus = paymentResponse.status === 'approved' ? 'paid' : 'pending';
      
      logStep("Processando pagamento de proposta", { proposalId: proposal_id, status: paymentStatus });

      // Buscar dados da proposta
      const { data: proposal, error: proposalError } = await supabaseClient
        .from('proposals')
        .select(`
          *,
          freelancer:profiles!proposals_freelancer_id_fkey(id, user_id, full_name),
          project:projects(id, title, profile_id)
        `)
        .eq('id', proposal_id)
        .single();

      if (proposalError || !proposal) {
        throw new Error('Proposta não encontrada');
      }

      // Calcular split do pagamento (10% comissão + taxas Mercado Pago)
      const { data: splitData } = await supabaseClient
        .rpc('calculate_payment_split', {
          _amount: finalAmount,
          _platform_commission_percent: 10,
        });

      if (!splitData || !Array.isArray(splitData) || splitData.length === 0) {
        throw new Error('Falha ao calcular split do pagamento');
      }

      const split = splitData[0];
      logStep("Split calculado", split);

      // Salvar pagamento na tabela de rastreamento
      const { error: insertPaymentError } = await supabaseClient
        .from("proposals_mercadopago_payments")
        .insert({
          proposal_id: proposal_id,
          user_id: user.id,
          payment_id: paymentResponse.id.toString(),
          amount: finalAmount,
          status: paymentStatus,
          payment_method: paymentMethod,
          qr_code: paymentResponse.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: paymentResponse.point_of_interaction?.transaction_data?.qr_code_base64,
          ticket_url: paymentResponse.point_of_interaction?.transaction_data?.ticket_url,
          payment_data: paymentResponse,
          credited_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
        });

      if (insertPaymentError) {
        logStep("Erro ao salvar pagamento na tabela de rastreamento", insertPaymentError);
      }

      // Atualizar proposta com informações do pagamento
      const { error: updateError } = await supabaseClient
        .from('proposals')
        .update({
          mercadopago_payment_id: paymentResponse.id.toString(),
          payment_status: paymentStatus === 'paid' ? 'paid' : 'pending',
          accepted_amount: finalAmount,
          freelancer_amount: split.freelancer_amount,
          platform_commission: split.platform_commission,
          stripe_processing_fee: split.stripe_fee,
        })
        .eq('id', proposal_id);

      if (updateError) {
        logStep("Erro ao atualizar proposta", updateError);
        throw updateError;
      }

      // Atualizar carteira do freelancer
      const { data: existingWallet } = await supabaseClient
        .from('freelancer_wallet')
        .select('*')
        .eq('profile_id', proposal.freelancer.id)
        .single();

      if (paymentStatus === 'paid') {
        // Se já foi pago, adicionar ao pending_balance
        if (existingWallet) {
          await supabaseClient
            .from('freelancer_wallet')
            .update({
              pending_balance: (existingWallet.pending_balance || 0) + split.freelancer_amount,
            })
            .eq('profile_id', proposal.freelancer.id);
        } else {
          await supabaseClient
            .from('freelancer_wallet')
            .insert({
              profile_id: proposal.freelancer.id,
              pending_balance: split.freelancer_amount,
              available_balance: 0,
              total_earned: 0,
              total_withdrawn: 0,
            });
        }
      }

      logStep("Proposta atualizada com sucesso");
    }
    
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
          status_detail: paymentResponse.status_detail,
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
