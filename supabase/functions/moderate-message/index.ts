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

    const systemPrompt = `Você é um moderador de conteúdo inteligente para uma plataforma de freelancers brasileira.

Sua tarefa é detectar tentativas de compartilhar informações de contato pessoal, incluindo:

1. **Números de telefone** em qualquer formato:
   - Formato padrão: (11) 98765-4321, 11987654321
   - Separados: 1 1 9 8 7 6 5 4 3 2 1
   - Com texto: "meu número é onze nove oito sete seis cinco quatro três dois um"
   - Disfarçados: "nove-oito-sete-seis-cinco-quatro-três-dois-um"

2. **WhatsApp** mencionado de qualquer forma:
   - "whatsapp", "wpp", "zap", "zapzap", "watts"
   - "me chama no whats", "add no zap"

3. **Redes sociais** e tentativas de contato externo:
   - Instagram: "insta", "instagram", "@usuario", "me segue no insta"
   - Twitter/X: "twitter", "@usuario"
   - Facebook: "face", "facebook", "fb"
   - Email: endereços de email ou menção a "email", "e-mail"
   - Outras plataformas: "telegram", "discord", "skype"

4. **Tentativas de burlar** usando:
   - Espaços entre números
   - Palavras por extenso para números
   - Substituição de letras: "@" por "arroba", "." por "ponto"
   - Mensagens em código

**IMPORTANTE**: 
- Seja rigoroso mas inteligente
- Números como "5 minutos", "3 projetos" são PERMITIDOS
- Valores monetários como "R$ 500" são PERMITIDOS
- Referências técnicas como "Node.js versão 18" são PERMITIDAS
- Apenas bloqueie quando houver CLARA intenção de compartilhar contato

Responda em JSON:
{
  "approved": true/false,
  "reason": "explicação curta do motivo (apenas se bloqueado)",
  "confidence": 0.0-1.0
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