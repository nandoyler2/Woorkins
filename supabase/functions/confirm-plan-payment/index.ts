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

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { persistSession: false } }
  );

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

    // Validate plan metadata
    const metadata = pi.metadata || {} as Record<string, string>;
    if (metadata.type !== "plan_subscription" || !metadata.profile_id || !metadata.plan_id) {
      throw new Error("Invalid plan metadata");
    }

    const profileId = metadata.profile_id;
    const planId = metadata.plan_id;
    const planSlug = metadata.plan_slug;

    // Ensure the caller owns this profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (profileErr || !profile || profile.id !== profileId) {
      throw new Error("Profile ownership mismatch");
    }

    // Check if already processed
    const { data: existingSubscription } = await supabase
      .from("user_subscription_plans")
      .select("id")
      .eq("user_id", profile.user_id)
      .eq("stripe_payment_intent_id", payment_intent_id)
      .maybeSingle();

    if (existingSubscription) {
      return new Response(
        JSON.stringify({ status: "ok", message: "Already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Deactivate all previous plans for this user
    await supabase
      .from("user_subscription_plans")
      .update({ is_active: false })
      .eq("user_id", profile.user_id);

    // Create new subscription record
    const subscriptionEnd = new Date();
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1); // 30 days from now

    await supabase
      .from("user_subscription_plans")
      .insert({
        user_id: profile.user_id,
        plan_type: planSlug,
        is_active: true,
        subscription_end: subscriptionEnd.toISOString(),
        stripe_payment_intent_id: payment_intent_id,
      });

    return new Response(
      JSON.stringify({ 
        status: "ok", 
        message: "Plan activated successfully",
        planType: planSlug,
        subscriptionEnd: subscriptionEnd.toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("confirm-plan-payment error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
