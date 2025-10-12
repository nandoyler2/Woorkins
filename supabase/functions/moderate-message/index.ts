import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();
    
    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ approved: false, reason: 'Conteúdo inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      // Default to approval on configuration error
      return new Response(
        JSON.stringify({ approved: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um moderador EXTREMAMENTE RIGOROSO de conteúdo para uma plataforma de freelancers brasileira.

Sua missão é detectar e BLOQUEAR QUALQUER tentativa de compartilhar informações de contato pessoal.

🚫 ABSOLUTAMENTE PROIBIDO compartilhar:

1. **Números de telefone** em QUALQUER formato:
   - Padrão: (11) 98765-4321, 11987654321, 11 98765-4321
   - Separado: 1 1 9 8 7 6 5 4 3 2 1
   - Por extenso: "um um nove oito sete", "onze nove oito"
   - Disfarçado: "nove.oito.sete.seis.cinco"
   - Qualquer sequência de 8-11 dígitos que pareça telefone
   - Código de área + número: "11 9", "21 9", "DDD 9"

2. **Apps de mensagem** (incluindo disfarces):
   - WhatsApp: "whats", "zap", "wpp", "what", "watts", "uats", "wp"
   - Telegram: "telegram", "telegran", "tg", "telgm"
   - Signal, Discord, Messenger, Skype

3. **Redes sociais** (incluindo variações):
   - Instagram: "insta", "ig", "gram", "inst@", "1nsta"
   - Facebook: "face", "fb", "f@ce"
   - Twitter/X: "tt", "twitter", "x"
   - TikTok: "tiktok", "tik tok"
   - LinkedIn: "linkedin", "in"

4. **Usernames e handles**:
   - Arrobas: "@usuario", "@ usuario", "arroba usuario"
   - Pontos: "usuario.sobrenome"
   - Underscores: "usuario_sobrenome"
   - "me procura como [nome]"

5. **E-mails** em qualquer formato:
   - usuario@dominio.com
   - "usuario arroba dominio ponto com"
   - "usuario [at] dominio [dot] com"

6. **Links e URLs**:
   - http, https, www
   - bit.ly, encurtadores
   - dominio.com, .com.br

7. **Tentativas de burlar detecção**:
   - "me procura no Insta"
   - "add no Zap"
   - "me acha lá"
   - "pesquisa meu nome no Instagram"
   - "me encontra no Face"
   - Números disfarçados: "nove nove nove nove"
   - Instruções indiretas para contato externo

⚠️ CRITÉRIOS DE BLOQUEIO:
- Seja ULTRA RIGOROSO
- Na dúvida, BLOQUEIE
- Qualquer menção de rede social ou app de mensagem = BLOQUEAR
- Sequência de números que pareça telefone = BLOQUEAR
- Referência a contato externo = BLOQUEAR

✅ PERMITIDO (não bloquear):
- "3 projetos", "5 dias", "10 horas"
- "R$ 500", "100 reais"
- "versão 18", "Node.js 16"
- Conversas normais sobre trabalho

Responda APENAS em JSON:
{
  "approved": true/false,
  "reason": "motivo específico da rejeição",
  "confidence": 1.0
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
          { role: 'user', content: `Analise esta mensagem: "${content}"` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('Lovable AI API error:', response.status, await response.text());
      // Default to approval on API error to not block users
      return new Response(
        JSON.stringify({ approved: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';
    
    console.log('AI Moderation Response:', aiResponse);

    // Try to parse JSON response
    let moderationResult;
    try {
      // Extract JSON from response if it's wrapped in text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        moderationResult = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, default to approval
        moderationResult = { approved: true, confidence: 0.5 };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Default to approval on parse error
      moderationResult = { approved: true, confidence: 0.5 };
    }

    // Extra safety: if confidence is low, approve by default
    if (moderationResult.confidence < 0.7 && !moderationResult.approved) {
      moderationResult.approved = true;
      moderationResult.reason = undefined;
    }

    return new Response(
      JSON.stringify(moderationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in moderate-message:', error);
    // Always default to approval on error to avoid blocking users
    return new Response(
      JSON.stringify({ approved: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});