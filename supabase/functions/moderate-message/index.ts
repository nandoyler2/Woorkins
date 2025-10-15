const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, recentMessages = [] } = await req.json();
    
    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ approved: false, reason: 'Conteúdo inválido', flagged: false }),
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

    // Prepare context from recent messages if available
    const contextMessages = recentMessages.length > 0 
      ? `\n\nMENSAGENS RECENTES DO MESMO USUÁRIO (para detectar tentativas de burla em múltiplas mensagens):\n${recentMessages.map((m: any, i: number) => `${i + 1}. "${m}"`).join('\n')}`
      : '';

    const systemPrompt = `Você é um moderador EXTREMAMENTE RIGOROSO de conteúdo para uma plataforma de freelancers brasileira.

Sua missão é detectar e BLOQUEAR QUALQUER tentativa de compartilhar informações de contato pessoal, INCLUINDO TENTATIVAS DE BURLA EM MÚLTIPLAS MENSAGENS.

🚨 ATENÇÃO ESPECIAL: DETECÇÃO DE BURLAS EM SEQUÊNCIA
Usuários tentam burlar a moderação dividindo informações em várias mensagens:
- Exemplo 1: "nandoyler" em uma msg + "11" em outra + "9" em outra + "8782" em outra + "6652" em outra
- Exemplo 2: "me acha no" + "insta" + "como" + "@usuario"
- Exemplo 3: Qualquer username de rede social + números em sequência = TELEFONE DIVIDIDO

SE DETECTAR ESTE PADRÃO = BLOQUEAR IMEDIATAMENTE E SINALIZAR

🚫 ABSOLUTAMENTE PROIBIDO compartilhar:

1. **Números de telefone** em QUALQUER formato:
   - Padrão: (11) 98765-4321, 11987654321, 11 98765-4321
   - Separado: 1 1 9 8 7 6 5 4 3 2 1
   - Por extenso: "um um nove oito sete", "onze nove oito"
   - Disfarçado: "nove.oito.sete.seis.cinco"
   - Qualquer sequência de 8-11 dígitos que pareça telefone
   - Código de área + número: "11 9", "21 9", "DDD 9"
   - MÚLTIPLAS MENSAGENS COM NÚMEROS CURTOS: se houver username + números em sequência = TELEFONE

2. **Apps de mensagem** (incluindo disfarces):
   - WhatsApp: "whats", "zap", "wpp", "what", "watts", "uats", "wp", "whatsa", "whts"
   - Telegram: "telegram", "telegran", "tg", "telgm", "telegr"
   - Signal, Discord, Messenger, Skype

3. **Redes sociais** (incluindo variações):
   - Instagram: "insta", "ig", "gram", "inst@", "1nsta", "instagr", "instagram"
   - Facebook: "face", "fb", "f@ce", "facebook"
   - Twitter/X: "tt", "twitter", "x"
   - TikTok: "tiktok", "tik tok"
   - LinkedIn: "linkedin", "in", "linked"

4. **Usernames e handles**:
   - Qualquer palavra que pareça username (sem espaços, com números/underscores)
   - Arrobas: "@usuario", "@ usuario", "arroba usuario"
   - Pontos: "usuario.sobrenome"
   - Underscores: "usuario_sobrenome"
   - "me procura como [nome]"
   - Nomes únicos sem contexto (ex: "nandoyler", "joao123")

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
   - "pesquisa meu nome"
   - "me encontra no Face"
   - "ve lá" (referência a rede social)
   - "no meu" (referência a perfil)
   - Números disfarçados: "nove nove nove nove"
   - Instruções indiretas para contato externo
   - Username + números em mensagens separadas

🚨 CRITÉRIOS DE BLOQUEIO E SINALIZAÇÃO:
- Seja ULTRA RIGOROSO
- Na dúvida, BLOQUEIE
- Qualquer menção de rede social ou app de mensagem = BLOQUEAR + SINALIZAR
- Sequência de números que pareça telefone = BLOQUEAR + SINALIZAR
- Username suspeito + números nas mensagens recentes = BLOQUEAR + SINALIZAR
- Referência a contato externo = BLOQUEAR + SINALIZAR
- Múltiplas mensagens curtas com números = COMPORTAMENTO SUSPEITO = SINALIZAR

✅ PERMITIDO (não bloquear):
- "3 projetos", "5 dias", "10 horas"
- "R$ 500", "100 reais"
- "versão 18", "Node.js 16"
- "item 1", "opção 2"
- Conversas normais sobre trabalho

📋 IMPORTANTE: SEMPRE forneça um motivo ESPECÍFICO e CLARO quando bloquear:
- Diga exatamente O QUE foi detectado (ex: "tentativa de compartilhar número de telefone", "menção ao WhatsApp", "username de rede social")
- Explique POR QUE foi bloqueado (ex: "viola política de não compartilhamento de contatos externos")
- Se detectou padrão em múltiplas mensagens, mencione isso

Responda APENAS em JSON:
{
  "approved": true/false,
  "reason": "MOTIVO ESPECÍFICO E DETALHADO da rejeição - diga exatamente o que foi detectado e por que",
  "confidence": 1.0,
  "flagged": true/false (true se detectar tentativa de burla grave que deve sinalizar o usuário)
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
          { role: 'user', content: `Analise esta mensagem: "${content}"${contextMessages}` }
        ],
        temperature: 0.2, // Lower temperature for more consistent detection
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
        moderationResult = { approved: true, confidence: 0.5, flagged: false };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Default to approval on parse error
      moderationResult = { approved: true, confidence: 0.5, flagged: false };
    }

    // Ensure flagged field exists
    if (moderationResult.flagged === undefined) {
      moderationResult.flagged = false;
    }

    // Extra safety: if confidence is low, approve by default (but keep flagged if detected)
    if (moderationResult.confidence < 0.7 && !moderationResult.approved) {
      moderationResult.approved = true;
      moderationResult.reason = undefined;
      // Keep flagged status to warn user
    }

    return new Response(
      JSON.stringify(moderationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in moderate-message:', error);
    // Always default to approval on error to avoid blocking users
    return new Response(
      JSON.stringify({ approved: true, flagged: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});