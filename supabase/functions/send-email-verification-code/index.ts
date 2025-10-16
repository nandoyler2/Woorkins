import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  newEmail: string;
}

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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

    const { newEmail }: RequestBody = await req.json();

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      throw new Error("Email inválido");
    }

    // Prevent sending code to the same email as current one
    if (user.email && user.email.toLowerCase() === newEmail.toLowerCase()) {
      throw new Error("O novo email deve ser diferente do atual");
    }

    // Generate 6-digit code
    const verificationCode = generateVerificationCode();

    // Delete any existing pending verifications for this user
    await supabase
      .from("email_change_verifications")
      .delete()
      .eq("user_id", user.id)
      .eq("verified", false);

    // Save verification code (expires in 10 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const { error: insertError } = await supabase
      .from("email_change_verifications")
      .insert({
        user_id: user.id,
        new_email: newEmail,
        verification_code: verificationCode,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      throw insertError;
    }

    // Get user profile for personalization
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const userName = profile?.full_name || "Usuário";

    // Send verification email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Woorkins <noreply@woorkins.com>",
        to: [newEmail],
        subject: "Confirme sua troca de email - Woorkins",
        html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                margin: 0;
                padding: 0;
                background-color: #f5f5f5;
              }
              .container {
                max-width: 600px;
                margin: 40px auto;
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
              }
              .header {
                background: linear-gradient(135deg, #9b87f5 0%, #7E69AB 100%);
                padding: 40px 30px;
                text-align: center;
              }
              .logo {
                font-size: 32px;
                font-weight: 800;
                color: white;
                margin-bottom: 10px;
              }
              .content {
                padding: 40px 30px;
              }
              .code-box {
                background: linear-gradient(135deg, #f6f6f7 0%, #e9e9eb 100%);
                border: 2px solid #9b87f5;
                border-radius: 12px;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
              }
              .code {
                font-size: 42px;
                font-weight: 800;
                color: #9b87f5;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
              }
              .warning {
                background: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                background: #f8f9fa;
                padding: 30px;
                text-align: center;
                color: #6c757d;
                font-size: 14px;
              }
              h1 {
                color: #1a1a1a;
                margin-top: 0;
              }
              .highlight {
                color: #9b87f5;
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">WOORKINS</div>
                <p style="color: white; margin: 0; opacity: 0.9;">Conecte. Trabalhe. Confie.</p>
              </div>
              
              <div class="content">
                <h1>Olá, ${userName}!</h1>
                <p>Você solicitou a troca do email da sua conta Woorkins.</p>
                
                <p>Para confirmar esta alteração, use o código de verificação abaixo:</p>
                
                <div class="code-box">
                  <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 14px;">CÓDIGO DE VERIFICAÇÃO</p>
                  <div class="code">${verificationCode}</div>
                  <p style="margin: 10px 0 0 0; color: #6c757d; font-size: 14px;">Válido por 10 minutos</p>
                </div>
                
                <div class="warning">
                  <strong>⚠️ Importante:</strong><br>
                  Se você não solicitou esta alteração, ignore este email e seu email permanecerá o mesmo.
                </div>
                
                <p style="margin-top: 30px;">
                  Após confirmar, você precisará fazer login novamente com seu novo email.
                </p>
              </div>
              
              <div class="footer">
                <p style="margin: 0 0 10px 0;">Este é um email automático, por favor não responda.</p>
                <p style="margin: 0;">© ${new Date().getFullYear()} Woorkins. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      }),
    });

    console.log("Verification email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Código de verificação enviado com sucesso" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-email-verification-code:", error);
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
