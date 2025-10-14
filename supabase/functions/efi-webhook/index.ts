import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EFI-WEBHOOK] ${step}${detailsStr}`);
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

    const webhookData = await req.json();
    logStep("Dados do webhook", webhookData);

    // Processar webhook PIX
    if (webhookData.pix) {
      for (const pix of webhookData.pix) {
        logStep("Processando PIX", { txid: pix.txid, status: pix.status });

        if (pix.status === "CONCLUIDA") {
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

    // Processar webhook de cartão
    if (webhookData.charge) {
      logStep("Processando cobrança cartão", {
        chargeId: webhookData.charge.id,
        status: webhookData.charge.status,
      });

      if (webhookData.charge.status === "paid") {
        const chargeId = webhookData.charge.id;

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

          logStep("Negociação atualizada");
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

          logStep("Proposta atualizada");
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
