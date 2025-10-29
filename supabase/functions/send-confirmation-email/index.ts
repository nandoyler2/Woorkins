import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailData {
  user: {
    email: string;
    full_name?: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: EmailData = await req.json();
    
    console.log("Received email request for:", payload.user.email);

    const { user, email_data } = payload;
    const confirmationUrl = `${email_data.site_url}/auth/confirm?token_hash=${email_data.token_hash}&type=email&redirect_to=${encodeURIComponent('/welcome')}`;
    
    // Extract first name from full_name
    const firstName = user.full_name?.split(' ')[0] || 'Usuário';

    // Create beautiful HTML email
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
            
            <!-- Logo Section -->
            <tr>
              <td style="padding: 40px 40px 32px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
                <img src="https://bvjulkcmzfzyfwobwlnx.supabase.co/storage/v1/object/public/business-logos/logo-woorkins-2.png" alt="Woorkins" style="width: 180px; height: auto; display: inline-block;">
              </td>
            </tr>
            
            <!-- Content Section -->
            <tr>
              <td style="padding: 40px 40px;">
                <h1 style="margin: 0 0 24px; color: #1f2937; font-size: 28px; font-weight: bold; text-align: center;">
                  Bem-vindo ao Woorkins! 🎉
                </h1>
                
                <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 26px;">
                  Olá <strong>${firstName}</strong>,
                </p>
                
                <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 26px;">
                  Obrigado por se cadastrar no Woorkins, a plataforma que conecta profissionais e empresas!
                </p>
                
                <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 26px;">
                  Para começar a aproveitar todos os recursos, confirme seu email clicando no botão abaixo:
                </p>
                
                <!-- Button Section -->
                <table role="presentation" style="width: 100%; margin: 32px 0;">
                  <tr>
                    <td align="center">
                      <a href="${confirmationUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 40px; border-radius: 8px; cursor: pointer;">
                        Confirmar Email
                      </a>
                    </td>
                  </tr>
                </table>
                
                <p style="margin: 24px 0 8px; color: #6b7280; font-size: 14px; line-height: 22px;">
                  Ou copie e cole este link no seu navegador:
                </p>
                <p style="margin: 0 0 16px; word-break: break-all;">
                  <a href="${confirmationUrl}" style="color: #3b82f6; font-size: 14px; text-decoration: none;">
                    ${confirmationUrl}
                  </a>
                </p>
                
                <p style="margin: 24px 0 16px; color: #374151; font-size: 16px; line-height: 26px;">
                  Após confirmar seu email, você poderá:
                </p>
                
                <ul style="margin: 0 0 24px; padding-left: 20px; color: #374151; font-size: 16px; line-height: 26px;">
                  <li style="margin-bottom: 8px;">✓ Criar seu perfil profissional</li>
                  <li style="margin-bottom: 8px;">✓ Conectar com empresas e profissionais</li>
                  <li style="margin-bottom: 8px;">✓ Publicar e buscar projetos</li>
                  <li style="margin-bottom: 8px;">✓ Iniciar negociações</li>
                  <li style="margin-bottom: 8px;">✓ Muito mais!</li>
                </ul>
                
                <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 22px;">
                  Se você não criou uma conta no Woorkins, ignore este email.
                </p>
              </td>
            </tr>
            
            <!-- Footer Section -->
            <tr>
              <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
                <p style="margin: 0 0 8px; color: #9ca3af; font-size: 14px; line-height: 22px;">
                  © ${new Date().getFullYear()} Woorkins. Todos os direitos reservados.
                </p>
                <p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 22px;">
                  Conectando talentos e oportunidades
                </p>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Woorkins <noreply@woorkins.com>",
      to: [user.email],
      subject: "Confirme seu email no Woorkins",
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, id: emailResponse.data?.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error sending confirmation email:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString() 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
