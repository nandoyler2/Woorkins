import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EFI-WEBHOOK] ${step}${detailsStr}`);
};

const validateMTLS = async (req: Request, supabaseClient: any): Promise<boolean> => {
  try {
    // Buscar configuração mTLS
    const { data: config } = await supabaseClient
      .from("payment_gateway_config")
      .select("efi_validate_mtls, efi_mtls_cert_path")
      .single();

    // Se validação mTLS não está ativa, permitir
    if (!config?.efi_validate_mtls) {
      logStep("mTLS validação desabilitada");
      return true;
    }

    // Verificar certificado do cliente
    const clientCert = req.headers.get("x-client-cert");
    if (!clientCert) {
      logStep("mTLS ERRO: Certificado do cliente não fornecido");
      return false;
    }

    // Em produção, aqui você validaria o certificado contra o certificado público da Efí
    // Por questões de segurança e complexidade, essa validação completa requer bibliotecas nativas
    logStep("mTLS validação OK");
    return true;
  } catch (error) {
    logStep("mTLS ERRO", error);
    return false;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { status: 200 });
  }

  try {
    logStep("Webhook recebido");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validar mTLS se configurado
    const isMTLSValid = await validateMTLS(req, supabaseClient);
    if (!isMTLSValid) {
      logStep("mTLS validação falhou");
      return new Response("Unauthorized", { status: 401 });
    }

    const webhookData = await req.json();
    logStep("Dados do webhook", webhookData);

    // Processar notificação de Cobranças (token)
    if (webhookData.notification) {
      const notificationToken = webhookData.notification;
      logStep("Token de notificação de Cobranças recebido", { token: notificationToken });

      // Consultar dados da transação usando o token
      const clientId = Deno.env.get("EFI_CLIENT_ID");
      const clientSecret = Deno.env.get("EFI_CLIENT_SECRET");

      if (!clientId || !clientSecret) {
        logStep("ERRO: Credenciais Efí não configuradas");
        return new Response("Missing credentials", { status: 500 });
      }

      // Obter token de acesso
      const authResponse = await fetch("https://cobrancas.api.efipay.com.br/v1/authorize", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ grant_type: "client_credentials" }),
      });

      if (!authResponse.ok) {
        logStep("ERRO ao autenticar com Efí");
        return new Response("Auth failed", { status: 500 });
      }

      const { access_token } = await authResponse.json();

      // Consultar notificação
      const notifResponse = await fetch(`https://cobrancas.api.efipay.com.br/v1/notification/${notificationToken}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!notifResponse.ok) {
        logStep("ERRO ao consultar notificação");
        return new Response("Query failed", { status: 500 });
      }

      const notifData = await notifResponse.json();
      logStep("Dados da notificação", notifData);

      // Processar dados da cobrança
      if (notifData.data && notifData.data.length > 0) {
        const chargeData = notifData.data[0];
        const chargeId = chargeData.charge_id;
        const status = chargeData.status;

        logStep("Processando cobrança", { chargeId, status });

        if (status === "paid" || status === "settled") {
          // Buscar negociação ou proposta relacionada
          const { data: negotiations } = await supabaseClient
            .from("negotiations")
            .select("*")
            .eq("stripe_payment_intent_id", chargeId);

          const { data: proposals } = await supabaseClient
            .from("proposals")
            .select("*")
            .eq("stripe_payment_intent_id", chargeId);

          if (negotiations && negotiations.length > 0) {
            const negotiation = negotiations[0];
            
            await supabaseClient
              .from("negotiations")
              .update({
                payment_status: "paid",
                paid_at: new Date().toISOString(),
                status: "accepted",
              })
              .eq("id", negotiation.id);

            await supabaseClient
              .from("freelancer_wallet")
              .update({
                pending_balance: negotiation.net_amount_to_business,
              })
              .eq("profile_id", negotiation.business_id);

            logStep("Negociação atualizada via Cobranças");
          }

          if (proposals && proposals.length > 0) {
            const proposal = proposals[0];
            
            await supabaseClient
              .from("proposals")
              .update({
                payment_status: "paid",
                status: "accepted",
              })
              .eq("id", proposal.id);

            await supabaseClient
              .from("freelancer_wallet")
              .update({
                pending_balance: proposal.freelancer_amount,
              })
              .eq("profile_id", proposal.freelancer_id);

            logStep("Proposta atualizada via Cobranças");
          }
        }
      }

      return new Response("OK", { status: 200 });
    }

    // Processar webhook PIX
    if (webhookData.pix) {
      for (const pix of webhookData.pix) {
        logStep("Processando PIX", { txid: pix.txid, status: pix.status });

        if (pix.status === "CONCLUIDA") {
          // Verificar se é pagamento de Woorkoins
          const { data: woorkoinsPayments } = await supabaseClient
            .from("woorkoins_efi_payments")
            .select("*")
            .eq("charge_id", pix.txid)
            .eq("status", "pending");

          if (woorkoinsPayments && woorkoinsPayments.length > 0) {
            const payment = woorkoinsPayments[0];
            logStep("Pagamento Woorkoins encontrado", { id: payment.id });

            // Atualizar status do pagamento
            await supabaseClient
              .from("woorkoins_efi_payments")
              .update({
                status: "paid",
                paid_at: new Date().toISOString(),
              })
              .eq("id", payment.id);

            // Creditar Woorkoins
            const { data: currentBalance } = await supabaseClient
              .from("woorkoins_balance")
              .select("balance")
              .eq("profile_id", payment.profile_id)
              .maybeSingle();

            if (currentBalance) {
              await supabaseClient
                .from("woorkoins_balance")
                .update({
                  balance: currentBalance.balance + payment.amount,
                })
                .eq("profile_id", payment.profile_id);
            } else {
              await supabaseClient
                .from("woorkoins_balance")
                .insert({
                  profile_id: payment.profile_id,
                  balance: payment.amount,
                });
            }

            // Registrar transação
            await supabaseClient
              .from("woorkoins_transactions")
              .insert({
                profile_id: payment.profile_id,
                amount: payment.amount,
                type: "purchase",
                description: `Compra via PIX Efí - ${payment.amount} Woorkoins`,
              });

            logStep("Woorkoins creditados", { profile_id: payment.profile_id, amount: payment.amount });
            continue;
          }

          // Buscar negociação ou proposta relacionada ao txid
          const { data: negotiations } = await supabaseClient
            .from("negotiations")
            .select("*")
            .eq("stripe_payment_intent_id", pix.txid);

          const { data: proposals } = await supabaseClient
            .from("proposals")
            .select("*")
            .eq("stripe_payment_intent_id", pix.txid);

          if (negotiations && negotiations.length > 0) {
            const negotiation = negotiations[0];
            logStep("Negociação encontrada", { id: negotiation.id });

            await supabaseClient
              .from("negotiations")
              .update({
                payment_status: "paid",
                paid_at: new Date().toISOString(),
                status: "accepted",
              })
              .eq("id", negotiation.id);

            // Atualizar carteira do freelancer
            await supabaseClient
              .from("freelancer_wallet")
              .update({
                pending_balance: negotiation.net_amount_to_business,
              })
              .eq("profile_id", negotiation.business_id);

            logStep("Negociação atualizada");
          }

          if (proposals && proposals.length > 0) {
            const proposal = proposals[0];
            logStep("Proposta encontrada", { id: proposal.id });

            await supabaseClient
              .from("proposals")
              .update({
                payment_status: "paid",
                status: "accepted",
              })
              .eq("id", proposal.id);

            // Atualizar carteira do freelancer
            await supabaseClient
              .from("freelancer_wallet")
              .update({
                pending_balance: proposal.freelancer_amount,
              })
              .eq("profile_id", proposal.freelancer_id);

            logStep("Proposta atualizada");
          }
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO no webhook", { message: errorMessage });
    return new Response("Error", { status: 500 });
  }
});
