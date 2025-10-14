import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MERCADOPAGO-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook recebido");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const webhookData = await req.json();
    logStep("Dados do webhook", webhookData);

    // Mercado Pago envia notificações do tipo "payment"
    if (webhookData.type === "payment") {
      const paymentId = webhookData.data.id;
      logStep("Processando pagamento", { paymentId });

      // Buscar detalhes do pagamento na API do Mercado Pago
      const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
      if (!accessToken) {
        throw new Error("Token de acesso não configurado");
      }

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar pagamento: ${response.status}`);
      }

      const payment = await response.json();
      logStep("Detalhes do pagamento", { status: payment.status });

      // Buscar registro na tabela de pagamentos
      const { data: paymentRecord, error: findError } = await supabaseClient
        .from("woorkoins_mercadopago_payments")
        .select("*")
        .eq("payment_id", paymentId.toString())
        .single();

      if (findError || !paymentRecord) {
        logStep("Pagamento não encontrado no banco", { paymentId });
        return new Response(JSON.stringify({ status: "payment not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Se pagamento foi aprovado
      if (payment.status === "approved" && paymentRecord.status !== "paid") {
        logStep("Pagamento aprovado, creditando Woorkoins", {
          profileId: paymentRecord.profile_id,
          amount: paymentRecord.amount,
        });

        // Atualizar status do pagamento
        await supabaseClient
          .from("woorkoins_mercadopago_payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            payment_data: payment,
          })
          .eq("payment_id", paymentId.toString());

        // Creditar Woorkoins
        const { data: balance } = await supabaseClient
          .from("woorkoins_balance")
          .select("balance")
          .eq("profile_id", paymentRecord.profile_id)
          .single();

        if (balance) {
          await supabaseClient
            .from("woorkoins_balance")
            .update({
              balance: balance.balance + paymentRecord.amount,
            })
            .eq("profile_id", paymentRecord.profile_id);
        } else {
          await supabaseClient
            .from("woorkoins_balance")
            .insert({
              profile_id: paymentRecord.profile_id,
              balance: paymentRecord.amount,
            });
        }

        // Criar transação
        await supabaseClient
          .from("woorkoins_transactions")
          .insert({
            profile_id: paymentRecord.profile_id,
            type: "purchase",
            amount: paymentRecord.amount,
            description: `Compra de ${paymentRecord.amount} Woorkoins via Mercado Pago`,
          });

        logStep("Woorkoins creditados com sucesso");
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
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
