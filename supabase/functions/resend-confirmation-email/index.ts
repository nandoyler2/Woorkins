import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  email: string;
  full_name?: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name }: RequestBody = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Buscar o usuário completo para pegar o full_name
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Erro ao buscar usuário:", usersError);
    }

    const user = usersData?.users?.find(u => u.email === email);
    const userFullName = user?.user_metadata?.full_name || full_name || "Usuário";
    const firstName = userFullName.split(" ")[0];

    const baseUrl = "https://woorkins.com";

    // Gerar link de verificação via magiclink
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${baseUrl}/welcome`,
      },
    });

    if (linkError) {
      console.error("Erro generateLink:", linkError);
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const actionLink = (linkData as any)?.properties?.action_link || (linkData as any)?.action_link;
    if (!actionLink) {
      return new Response(JSON.stringify({ error: "Não foi possível gerar o link de confirmação" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Usar o actionLink exatamente como retornado pelo backend, apenas ajustar redirect_to
    const confirmationUrl = new URL(actionLink);
    confirmationUrl.searchParams.set('redirect_to', `${baseUrl}/welcome`);
    const confirmationLink = confirmationUrl.toString();

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirme seu email no Woorkins</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 40px 0;">
          <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <tr>
              <td style="padding: 40px 40px 32px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
                <img src="https://woorkins.com/assets/woorkins-DjD6e8af.png" alt="Woorkins" style="width: 180px; height: auto; display: inline-block;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 40px;">
                <h1 style="margin: 0 0 24px; color: #1f2937; font-size: 28px; font-weight: bold; text-align: center;">Bem-vindo ao Woorkins! 🎉</h1>
                <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 26px;">Olá <strong>${firstName}</strong>,</p>
                <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 26px;">Obrigado por se cadastrar no Woorkins! Para começar, confirme seu email clicando no botão abaixo:</p>
                <table role="presentation" style="width: 100%; margin: 32px 0;">
                  <tr>
                    <td align="center">
                      <a href="${confirmationLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 40px; border-radius: 8px; cursor: pointer;">Confirmar Email</a>
                    </td>
                  </tr>
                </table>
                <p style="margin: 24px 0 8px; color: #6b7280; font-size: 14px; line-height: 22px;">Ou copie e cole este link no navegador:</p>
                <p style="margin: 0 0 16px; word-break: break-all;"><a href="${confirmationLink}" style="color: #3b82f6; font-size: 14px; text-decoration: none;">${confirmationLink}</a></p>
                <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 22px;">Se você não criou uma conta no Woorkins, ignore este email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
                <p style="margin: 0 0 8px; color: #9ca3af; font-size: 14px; line-height: 22px;">© ${new Date().getFullYear()} Woorkins. Todos os direitos reservados.</p>
                <p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 22px;">Conectando talentos e oportunidades</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
    // Attach inline logo via CID - REMOVED, using direct URL instead
    const emailResponse = await resend.emails.send({
      from: "Woorkins <noreply@woorkins.com>",
      to: [email],
      subject: "Confirme seu email no Woorkins",
      html,
    });

    console.log("Custom confirmation email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in resend-confirmation-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});