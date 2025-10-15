const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, recentMessages = [], imageUrl, isPaid = false } = await req.json();
    
    if (!content && !imageUrl) {
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

    // Helpers to detect explicit contact indicators in the CURRENT message only
    const textContent: string = typeof content === 'string' ? content : '';

    const hasContactIndicators = (t: string): boolean => {
      if (!t) return false;
      const tOrig = String(t);
      const tLow = tOrig.toLowerCase();
      const tNoAccents = tLow.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // De-leet speak to catch disguised app names and @handles
      const leetMap: Record<string, string> = { '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g' };
      const tDeLeet = tNoAccents.replace(/[0123456789]/g, (d) => leetMap[d] || d);

      const haystacks = [tLow, tNoAccents, tDeLeet];

      // URLs and links - block only if project is not paid
      if (!isPaid && haystacks.some(h => /(https?:\/\/|www\.|\.com|\.br|\.net|\.org)/i.test(h))) return true;

      // Emails - improved detection including split attempts
      if (haystacks.some(h => /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(h))) return true;
      if (haystacks.some(h => /\b(arroba|at)\b/i.test(h))) return true; // email components
      if (/(gmail|hotmail|outlook|yahoo|email|mail)/.test(tNoAccents)) return true; // email services
      if (/(ponto\s*com|dot\s*com)/i.test(tNoAccents)) return true; // email endings

      // @handles (after de-leet too) - more strict
      if (haystacks.some(h => /@\w+/i.test(h))) return true; // any @ followed by word chars

      // Messaging/social app keywords (after de-leet too)
      const appRegex = /\b(whats(app)?|zap|wpp|telegram|tg|signal|discord|messenger|skype|instagram|insta|ig|facebook|fb|tiktok|linkedin|tt|twitter|x)\b/i;
      if (haystacks.some(h => appRegex.test(h))) return true;

      // PIX keywords
      const pixRegex = /\b(pix|chave\s*pix|meu\s*pix|chave|codigo\s*pix)\b/i;
      if (haystacks.some(h => pixRegex.test(h))) return true;

      // Digits embedded in words: if ANY digits exist, we should NOT early-approve (let AI analyze)
      if (/\d/.test(tOrig)) return true;

      // Phone-like digit sequences when collapsing non-digits
      const onlyDigits = tOrig.replace(/\D/g, '');
      if (/\d{8,12}/.test(onlyDigits)) return true; // any 8-12 window

      // Detect spelled-out numbers (pt-BR) joined to form phone-like sequences
      const numWords: Record<string, string> = { zero: '0', um: '1', uma: '1', dois: '2', duas: '2', tres: '3', quatro: '4', cinco: '5', seis: '6', sete: '7', oito: '8', nove: '9' };
      const tokens = tNoAccents.split(/[^a-z0-9]+/);
      const mapped = tokens.map(tok => (numWords[tok] ?? '')).join('');
      if (/\d{8,12}/.test(mapped)) return true;

      return false;
    };

    // If there's no image and the current message has NO explicit indicators, approve immediately
    if (!imageUrl && !hasContactIndicators(textContent)) {
      return new Response(
        JSON.stringify({ approved: true, flagged: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Prepare context from recent messages if available
    const contextMessages = recentMessages.length > 0 
      ? `\n\nMENSAGENS RECENTES DO MESMO USUÁRIO (para detectar tentativas de burla em múltiplas mensagens):\n${recentMessages.map((m: any, i: number) => `${i + 1}. "${m}"`).join('\n')}`
      : '';

    const systemPrompt = `Você é um moderador EXTREMAMENTE RIGOROSO de conteúdo para uma plataforma de freelancers brasileira.

Sua missão é detectar e BLOQUEAR QUALQUER tentativa de compartilhar informações de contato pessoal, INCLUINDO TENTATIVAS DE BURLA EM MÚLTIPLAS MENSAGENS E IMAGENS QUE CONTENHAM CONTATOS.

🚨 ATENÇÃO ESPECIAL: DETECÇÃO DE BURLAS EM SEQUÊNCIA
Usuários tentam burlar a moderação dividindo informações em várias mensagens:
- Exemplo 1: "@nandoyler" = BLOQUEAR (username de rede social)
- Exemplo 2: "quentemail" + "ponto com" = tentativa de formar email
- Exemplo 3: Qualquer @ seguido de texto = handle de rede social
- Exemplo 4: Imagem com número de telefone (ex: 11 993912083)

SE DETECTAR ESTE PADRÃO = BLOQUEAR IMEDIATAMENTE E SINALIZAR

🚫 ABSOLUTAMENTE PROIBIDO compartilhar:

1. **USERNAMES E @HANDLES - BLOQUEIO AUTOMÁTICO**:
   - QUALQUER @ seguido de caracteres (ex: @nandoyler, @usuario, @qualquercoisa)
   - Usernames sem @ mas que pareçam handles de redes sociais
   - "me procura como [nome]", "meu user é", "me acha no"
   - Combinações únicas sem espaço (ex: "nandoyler", "joao_silva123")

2. **E-MAILS - BLOQUEIO RIGOROSO**:
   - usuario@dominio.com
   - Tentativas divididas: "quentemail" + "ponto com" = email
   - "arroba", "at", "@"
   - Menções a serviços: gmail, hotmail, outlook, yahoo
   - "ponto com", "dot com", ".com"

3. **PIX - ATENÇÃO MÁXIMA (Brasil)**:
   - Palavra "pix" em qualquer contexto que indique compartilhamento
   - "meu pix", "chave pix", "pix é", "te passo o pix", "preciso do seu pix"
   - Combinação de "pix" + número/CPF/email/telefone
   - "chave"

4. **Números de telefone** em QUALQUER formato:
   - Padrão: (11) 98765-4321, 11987654321, 11 98765-4321
   - Separado: 1 1 9 8 7 6 5 4 3 2 1
   - Por extenso: "um um nove oito sete", "onze nove oito"
   - Disfarçado: "nove.oito.sete.seis.cinco"
   - **NÚMEROS DISFARÇADOS EM FRASES**: "993912083 motivos", "11999887766 razões"
   - **🚨 CRÍTICO - NÚMEROS CAMUFLADOS**: "tem 993 cavalos e anda a 912 km/h e a 083 segundos" = 993912083
   - **EXTRAIR TODOS OS NÚMEROS**: Se ao juntar TODOS os números da frase formar 8-11 dígitos = TELEFONE
   - Qualquer sequência de 8-11 dígitos MESMO QUE disfarçada em texto normal
   - Código de área + número: "11 9", "21 9", "DDD 9"

5. **Apps de mensagem** (incluindo disfarces):
   - WhatsApp: "whats", "zap", "wpp", "what", "watts", "uats", "wp", "whatsa", "whts"
   - Telegram: "telegram", "telegran", "tg", "telgm", "telegr"
   - Signal, Discord, Messenger, Skype

6. **Redes sociais** (incluindo variações):
   - Instagram: "insta", "ig", "gram", "inst@", "1nsta", "instagr", "instagram"
   - Facebook: "face", "fb", "f@ce", "facebook"
   - Twitter/X: "tt", "twitter", "x"
   - TikTok: "tiktok", "tik tok"
   - LinkedIn: "linkedin", "in", "linked"

7. **Links e URLs**:
   - http, https, www
   - bit.ly, encurtadores
   - dominio.com, .com.br

8. **IMAGENS com informações de contato - ANÁLISE ULTRA RIGOROSA**:
   - 🚨 PRIORIDADE MÁXIMA: Números de telefone em QUALQUER parte da imagem
   - Números visíveis em fotos de pessoas, objetos, telas, documentos
   - Números em textos sobrepostos (como: "11 99612083" ou "11992612083")
   - Mesmo se o número estiver discretamente posicionado
   - Mesmo se o número aparecer em contexto aparentemente inocente (ex: em uma foto de aperto de mãos)
   - Capturas de tela de conversas ou perfis
   - QR codes do WhatsApp ou outras redes
   - Cards de visita ou informações de contato
   - Qualquer imagem que contenha @ (arroba) ou links
   - Informações de contato em cartões, documentos, telas de celular
   - **ESCANEAR TODA A IMAGEM**: Procure atentamente por sequências de 8-11 dígitos em TODAS as áreas da imagem
   - **FORMATOS VARIADOS**: (11) 99999-9999, 11 99999-9999, 11999999999, etc.

🚨 CRITÉRIOS DE BLOQUEIO E SINALIZAÇÃO:
- Seja EXTREMAMENTE RIGOROSO com @handles, emails e imagens com contatos.
- BLOQUEAR IMEDIATAMENTE:
  * QUALQUER @ seguido de texto (ex: @nandoyler)
  * Partes de email (gmail, hotmail, ponto com, arroba)
  * Sequência de 8-11 dígitos consecutivos NO TEXTO
  * 🔥 IMAGENS: QUALQUER sequência de 8-11 dígitos visível na imagem (mesmo em fotos normais)
  * 🔥 IMAGENS: Números de telefone com DDD brasileiro (11, 21, 81, 85, etc.) seguidos de 8-9 dígitos
  * 🔥 IMAGENS: Mesmo números parcialmente visíveis ou em segundo plano
  * Menção a PIX + intenção de compartilhar
  * E-mail, URL, @handle, menção explícita a apps

✅ PERMITIDO (não bloquear):
- Palavras genéricas sem detalhes (ex: "número", "rede social", "contato")
- "3 projetos", "5 dias", "10 horas"

📋 IMPORTANTE: SEMPRE forneça um motivo ESPECÍFICO e CLARO quando bloquear:
- Diga exatamente O QUE foi detectado
- Explique POR QUE foi bloqueado
- Se detectou padrão em múltiplas mensagens ou imagens, mencione isso

Responda APENAS em JSON:
{
  "approved": true/false,
  "reason": "MOTIVO ESPECÍFICO E DETALHADO da rejeição - diga exatamente o que foi detectado e por que",
  "confidence": 1.0,
  "flagged": true/false (true se detectar tentativa de burla grave que deve sinalizar o usuário)
}`;

    // Prepare message content based on whether we have text, image, or both
    let userMessage: any;
    
    if (imageUrl) {
      // If we have an image, use multimodal analysis
      userMessage = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: content 
              ? `Analise esta imagem e mensagem: "${content}"${contextMessages}\n\n🔍 ANÁLISE CRÍTICA DE IMAGEM - PROCURE ATENTAMENTE:\n- ESCANEAR TODA A IMAGEM procurando números de telefone (8-11 dígitos)\n- Números com DDD brasileiro: (11) 9XXXX-XXXX, 11 9XXXXXXXX, etc.\n- Números em qualquer formato ou localização na imagem\n- Mesmo em fotos que parecem normais (pessoas, objetos, documentos)\n- @usernames, emails, QR codes, links visíveis\n- Qualquer tentativa de compartilhar contatos`
              : `Analise esta imagem:${contextMessages}\n\n🔍 ANÁLISE CRÍTICA DE IMAGEM - PROCURE ATENTAMENTE:\n- ESCANEAR TODA A IMAGEM procurando números de telefone (8-11 dígitos)\n- Números com DDD brasileiro: (11) 9XXXX-XXXX, 11 9XXXXXXXX, etc.\n- Números em qualquer formato ou localização na imagem\n- Mesmo em fotos que parecem normais (pessoas, objetos, documentos)\n- @usernames, emails, QR codes, links visíveis\n- Qualquer tentativa de compartilhar contatos`
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl
            }
          }
        ]
      };
    } else {
      // Text only
      userMessage = {
        role: 'user',
        content: `Analise esta mensagem: "${content}"${contextMessages}`
      };
    }

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
          userMessage
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

    // If message is rejected, mark it as deleted
    if (!moderationResult.approved) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { messageId } = await req.json();
          
          if (messageId) {
            // Update the message to mark it as deleted
            const updateResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/negotiation_messages?id=eq.${messageId}`,
              {
                method: 'PATCH',
                headers: {
                  'apikey': SUPABASE_SERVICE_ROLE_KEY,
                  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ is_deleted: true })
              }
            );
            
            console.log('Message marked as deleted:', updateResponse.ok);
          }
        } catch (error) {
          console.error('Error marking message as deleted:', error);
        }
      }
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