const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentMessage, recentMessages, messagesInLast3Seconds } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      // Default to not spam on configuration error
      return new Response(
        JSON.stringify({ isSpam: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um detector de spam que analisa se mensagens rápidas são REALMENTE spam ou apenas uma conversa natural e fluida.

IMPORTANTE: A pessoa pode estar apenas conversando normalmente e digitando rápido! Isso é COMPLETAMENTE NORMAL e NÃO é spam!

🔍 CRITÉRIOS PARA CLASSIFICAR COMO SPAM (SEJA RIGOROSO - SÓ BLOQUEIE SE REALMENTE FOR SPAM):

1. **Mensagens REPETITIVAS** (mesma coisa várias vezes):
   - "olá olá olá olá olá"
   - "oi oi oi oi"
   - Copiar/colar o mesmo texto repetidamente

2. **Mensagens SEM SENTIDO** na conversa:
   - Textos aleatórios que não fazem sentido no contexto
   - Sequências de letras ou números sem propósito
   - "asdfasdf", "12345", "aaaaa"

3. **Flood de mensagens vazias ou inúteis**:
   - Várias mensagens com apenas uma letra
   - "a", "b", "c", "d", "e"
   - Emojis repetidos sem contexto

4. **Tentativa clara de abusar do sistema**:
   - Mensagens claramente destinadas a poluir o chat
   - Comportamento de bot/automação

✅ NÃO É SPAM (PERMITIR - ISSO É NORMAL!):

1. **Conversa natural rápida**:
   - "oi"
   - "tudo bom?"
   - "você consegue fazer o projeto?"
   - "qual o prazo?"
   - Perguntas e respostas rápidas e naturais

2. **Respostas curtas legítimas**:
   - "sim"
   - "não"
   - "ok"
   - "pode ser"
   - "quanto custa?"

3. **Múltiplas mensagens que fazem sentido juntas**:
   - "preciso de um site"
   - "com sistema de login"
   - "e painel admin"
   (Isso é uma pessoa descrevendo o projeto em múltiplas mensagens)

4. **Entusiasmo ou urgência legítimos**:
   - Pessoa empolgada conversando rápido
   - Esclarecendo dúvidas rapidamente

📊 ANÁLISE:
- Considere que enviar ${messagesInLast3Seconds} mensagens em 3 segundos pode ser PERFEITAMENTE NORMAL em uma conversa
- Analise o CONTEXTO da conversa
- Verifique se as mensagens fazem SENTIDO juntas
- Só classifique como spam se for CLARAMENTE abusivo/repetitivo/sem sentido

Responda APENAS em JSON:
{
  "isSpam": true/false,
  "reason": "explicação breve se for spam, ou null se não for",
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
          {
            role: 'user',
            content: `CONVERSA RECENTE:
${recentMessages}

NOVA MENSAGEM: "${currentMessage}"

Número de mensagens nos últimos 3 segundos: ${messagesInLast3Seconds}

Esta nova mensagem é spam? Lembre-se: conversar rápido é NORMAL!`
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('Lovable AI API error:', response.status, await response.text());
      // Default to not spam on API error
      return new Response(
        JSON.stringify({ isSpam: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';
    
    console.log('AI Spam Analysis Response:', aiResponse);

    let spamResult;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        spamResult = JSON.parse(jsonMatch[0]);
      } else {
        spamResult = { isSpam: false, confidence: 0.5 };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      spamResult = { isSpam: false, confidence: 0.5 };
    }

    // Only consider it spam if confidence is high
    if (spamResult.confidence < 0.8) {
      spamResult.isSpam = false;
    }

    return new Response(
      JSON.stringify(spamResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-spam:', error);
    // Always default to not spam on error
    return new Response(
      JSON.stringify({ isSpam: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
