import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  oldEmail: string;
  newEmail: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { oldEmail, newEmail }: RequestBody = await req.json();

    if (!oldEmail || !newEmail) {
      return new Response(JSON.stringify({ error: "Emails são obrigatórios" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validar formato do novo email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return new Response(JSON.stringify({ error: "Novo email inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Buscar usuário pelo email antigo
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Erro ao listar usuários:", listError);
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const user = users?.find(u => u.email === oldEmail && !u.email_confirmed_at);
    
    if (!user) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado ou email já confirmado" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Atualizar o email
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email: newEmail,
      email_confirm: false,
    });

    if (updateError) {
      console.error("Erro ao atualizar email:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Email atualizado de ${oldEmail} para ${newEmail}`);

    // Enviar email de confirmação automaticamente
    try {
      const siteUrl = new URL(req.url).origin;
      
      const { error: emailError } = await supabaseAdmin.functions.invoke('resend-confirmation-email', {
        body: {
          email: newEmail,
          site_url: siteUrl,
        },
      });

      if (emailError) {
        console.error("Erro ao enviar email de confirmação:", emailError);
      } else {
        console.log(`Email de confirmação enviado para ${newEmail}`);
      }
    } catch (emailError: any) {
      console.error("Erro ao enviar email de confirmação:", emailError);
      // Não falhar a requisição se o email não puder ser enviado
    }

    return new Response(JSON.stringify({ success: true, newEmail }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Erro em update-unconfirmed-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});