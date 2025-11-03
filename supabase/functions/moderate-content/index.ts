import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurado');
    }

    const systemPrompt = `Você é um moderador de conteúdo para a plataforma Woorkins.

IMPORTANTE: Para o tipo "proposal", seja EXTREMAMENTE RIGOROSO com:
- Informações de contato externo (WhatsApp, Instagram, telefone, e-mail pessoal, Telegram, Facebook)
- Links externos à plataforma
- Tentativas de levar a conversa para fora da plataforma
- Números de telefone em qualquer formato
- Usernames de redes sociais (@usuario, "me segue", "me chama")

IMPORTANTE: Para o tipo "evaluation", seja EXTREMAMENTE RIGOROSO com:
- Linguagem ofensiva, xingamentos e palavrões (mesmo disfarçados com *, @ ou letras trocadas)
- Conteúdo sexual explícito ou sugestivo
- Spam e promoção não autorizada
- Ataques pessoais e difamação

Analise o conteúdo e identifique se contém:
- Linguagem ofensiva, preconceituosa ou discriminatória
- Palavrões e xingamentos (mesmo disfarçados)
- Spam ou conteúdo promocional não autorizado
- Informações de contato (telefone, WhatsApp, Instagram, Facebook, e-mail pessoal, Telegram)
- Links externos ou tentativa de desviar conversa da plataforma
- Informações falsas ou enganosas
- Conteúdo sexual inapropriado
- Violência ou incitação ao ódio
- Dados pessoais sensíveis (CPF, cartão de crédito, endereço completo)

Exemplos de conteúdo PROIBIDO em propostas:
- "me chama no whats 11 9999-9999"
- "me segue no instagram @usuario"
- "vou te passar meu email"
- "vamos conversar pelo telegram"
- "adiciona no face"
- "liga pra mim 11999999999"
- "meu número é"
- "chama no zap"

Exemplos de conteúdo PROIBIDO em avaliações:
- Qualquer palavrão ou xingamento
- Conteúdo sexual ou discriminatório
- Ataques pessoais graves
- Acusações sem fundamento

Responda APENAS com um JSON no formato:
{
  "approved": true/false,
  "reason": "motivo específico e claro da rejeição",
  "severity": "low/medium/high",
  "categories": ["categoria1", "categoria2"]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Tipo: ${type}\n\nConteúdo: ${content}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        // Em caso de rate limit, aprovar por padrão mas logar
        console.warn('AI moderation unavailable, approving by default');
        return new Response(JSON.stringify({ 
          approved: true, 
          reason: 'Moderação automática temporariamente indisponível',
          severity: 'low',
          categories: []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Parse JSON response
    const moderationResult = JSON.parse(aiResponse);

    return new Response(JSON.stringify(moderationResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in moderate-content:', error);
    // Em caso de erro, aprovar por padrão para não bloquear usuários
    return new Response(
      JSON.stringify({ 
        approved: true, 
        reason: 'Erro na moderação automática',
        severity: 'low',
        categories: []
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});