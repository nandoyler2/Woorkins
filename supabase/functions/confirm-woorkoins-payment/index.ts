import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth client (anon) for user verification
  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Admin client (service role) for DB writes bypassing RLS when needed
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const { payment_intent_id } = await req.json();
    if (!payment_intent_id) throw new Error("payment_intent_id is required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the PaymentIntent from Stripe
    const pi = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (pi.status !== "succeeded") {
      return new Response(
        JSON.stringify({ status: "pending", message: "Payment not succeeded yet" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Validate woorkoins metadata
    const metadata = pi.metadata || {} as Record<string, string>;
    if (metadata.type !== "woorkoins_purchase" || !metadata.profile_id || !metadata.woorkoins_amount) {
      throw new Error("Invalid woorkoins metadata");
    }

    const profileId = metadata.profile_id;
    const woorkoinsAmount = parseInt(metadata.woorkoins_amount);

    // Ensure the caller owns this profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (profileErr || !profile || profile.id !== profileId) {
      throw new Error("Profile ownership mismatch");
    }

    // Idempotency: check if already processed
    const { data: existingTx } = await supabase
      .from("woorkoins_transactions")
      .select("id")
      .eq("stripe_payment_intent_id", payment_intent_id)
      .maybeSingle();

    if (existingTx) {
      // Already processed
      const { data: balanceRow } = await supabase
        .from("woorkoins_balance")
        .select("balance")
        .eq("profile_id", profileId)
        .maybeSingle();

      return new Response(
        JSON.stringify({ status: "ok", balance: balanceRow?.balance ?? 0, processed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Upsert balance
    const { data: existingBalance } = await supabase
      .from("woorkoins_balance")
      .select("balance")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (existingBalance) {
      await supabase
        .from("woorkoins_balance")
        .update({ balance: (existingBalance.balance || 0) + woorkoinsAmount, updated_at: new Date().toISOString() })
        .eq("profile_id", profileId);
    } else {
      await supabase
        .from("woorkoins_balance")
        .insert({ profile_id: profileId, balance: woorkoinsAmount });
    }

    // Record transaction
    await supabase
      .from("woorkoins_transactions")
      .insert({
        profile_id: profileId,
        amount: woorkoinsAmount,
        type: "purchase",
        description: `Compra de ${woorkoinsAmount} Woorkoins`,
        stripe_payment_intent_id: payment_intent_id,
      });

    const { data: updatedBalance } = await supabase
      .from("woorkoins_balance")
      .select("balance")
      .eq("profile_id", profileId)
      .maybeSingle();

    return new Response(
      JSON.stringify({ status: "ok", balance: updatedBalance?.balance ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("confirm-woorkoins-payment error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});