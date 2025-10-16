import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { code }: RequestBody = await req.json();

    if (!code || code.length !== 6) {
      throw new Error("Código inválido");
    }

    // Find verification record
    const { data: verification, error: findError } = await supabase
      .from("email_change_verifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("verification_code", code)
      .eq("verified", false)
      .single();

    if (findError || !verification) {
      throw new Error("Código inválido ou expirado");
    }

    // Check if code is expired
    const expiresAt = new Date(verification.expires_at);
    if (expiresAt < new Date()) {
      throw new Error("Código expirado. Solicite um novo código.");
    }

    // Mark verification as verified
    const { error: updateError } = await supabase
      .from("email_change_verifications")
      .update({ verified: true })
      .eq("id", verification.id);

    if (updateError) {
      throw updateError;
    }

    // Update user email in Supabase Auth
    const { error: emailUpdateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { email: verification.new_email }
    );

    if (emailUpdateError) {
      throw emailUpdateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email atualizado com sucesso! Por favor, faça login novamente." 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-email-change-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === "Unauthorized" ? 401 : 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
