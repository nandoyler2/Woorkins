const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, recentMessages = [], imageUrl } = await req.json();
    
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

      // URLs
      if (haystacks.some(h => /(https?:\/\/|www\.)/i.test(h))) return true;

      // Emails
      if (haystacks.some(h => /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(h))) return true;

      // @handles (after de-leet too)
      if (haystacks.some(h => /@[a-z0-9._]{3,}/i.test(h))) return true;

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
- Exemplo 1: "nandoyler" em uma msg + "11" em outra + "9" em outra + "8782" em outra + "6652" em outra
- Exemplo 2: "me acha no" + "insta" + "como" + "@usuario"
- Exemplo 3: Qualquer username de rede social + números em sequência = TELEFONE DIVIDIDO

SE DETECTAR ESTE PADRÃO = BLOQUEAR IMEDIATAMENTE E SINALIZAR

🚫 ABSOLUTAMENTE PROIBIDO compartilhar:

1. **PIX - ATENÇÃO MÁXIMA (Brasil)**:
   - Palavra "pix" em qualquer contexto que indique compartilhamento
   - "meu pix", "chave pix", "pix é", "te passo o pix", "preciso do seu pix"
   - Combinação de "pix" + número/CPF/email/telefone
   - "chave"

2. **Números de telefone** em QUALQUER formato:
   - Padrão: (11) 98765-4321, 11987654321, 11 98765-4321
   - Separado: 1 1 9 8 7 6 5 4 3 2 1
   - Por extenso: "um um nove oito sete", "onze nove oito"
   - Disfarçado: "nove.oito.sete.seis.cinco"
   - **NÚMEROS DISFARÇADOS EM FRASES**: "993912083 motivos", "11999887766 razões", "21987654321 formas"
   - **🚨 CRÍTICO - NÚMEROS CAMUFLADOS**: "tem 993 cavalos e anda a 912 km/h e a 083 segundos" = 993912083
   - **EXTRAIR TODOS OS NÚMEROS**: Se ao juntar TODOS os números da frase formar 8-11 dígitos = TELEFONE
   - Qualquer sequência de 8-11 dígitos MESMO QUE disfarçada em texto normal
   - Código de área + número: "11 9", "21 9", "DDD 9"
   - **DETECTAR**: Números separados por palavras que ao juntar formem telefone brasileiro
   - MÚLTIPLAS MENSAGENS COM NÚMEROS CURTOS: se houver username + números em sequência = TELEFONE

3. **Apps de mensagem** (incluindo disfarces):
   - WhatsApp: "whats", "zap", "wpp", "what", "watts", "uats", "wp", "whatsa", "whts"
   - Telegram: "telegram", "telegran", "tg", "telgm", "telegr"
   - Signal, Discord, Messenger, Skype

4. **Redes sociais** (incluindo variações):
   - Instagram: "insta", "ig", "gram", "inst@", "1nsta", "instagr", "instagram"
   - Facebook: "face", "fb", "f@ce", "facebook"
   - Twitter/X: "tt", "twitter", "x"
   - TikTok: "tiktok", "tik tok"
   - LinkedIn: "linkedin", "in", "linked"

5. **Usernames e handles**:
   - Qualquer palavra que pareça username (sem espaços, com números/underscores)
   - Arrobas: "@usuario", "@ usuario", "arroba usuario"
   - Pontos: "usuario.sobrenome"
   - Underscores: "usuario_sobrenome"
   - "me procura como [nome]"
   - Nomes únicos sem contexto (ex: "nandoyler", "joao123")

6. **E-mails** em qualquer formato:
   - usuario@dominio.com
   - "usuario arroba dominio ponto com"
   - "usuario [at] dominio [dot] com"

7. **Links e URLs**:
   - http, https, www
   - bit.ly, encurtadores
   - dominio.com, .com.br

8. **Tentativas de burlar detecção**:
   - "me procura no Insta"
   - "add no Zap"
   - "me acha lá"
   - "pesquisa meu nome"
   - "me encontra no Face"
   - "ve lá" (referência a rede social)
   - "no meu" (referência a perfil)
   - Números disfarçados: "nove nove nove nove"
   - **"preciso do seu pix", "te passo o pix", "meu pix é"**
   - **Números disfarçados em frases normais**: "993912083 motivos", "tenho 11987654321 razões"
   - Instruções indiretas para contato externo
   - Username + números em mensagens separadas

9. **IMAGENS com informações de contato**:
   - Imagens contendo números de telefone
   - Capturas de tela de perfis de redes sociais
   - QR codes do WhatsApp ou outras redes
   - Textos com informações de contato em imagens
   - Cards de visita ou informações de contato
   - Qualquer imagem que contenha @ (arroba) ou links

🚨 CRITÉRIOS DE BLOQUEIO E SINALIZAÇÃO:
- Seja RIGOROSO, porém NÃO bloqueie mensagens neutras.
- Na dúvida, APROVE e apenas marque "flagged": true se achar suspeito.
- BLOQUEAR somente quando houver INDÍCIO CLARO E ACIONÁVEL NA MENSAGEM ATUAL ou quando a MENSAGEM ATUAL traz parte essencial (dígitos/handle/link) que completa, junto das mensagens recentes, um contato externo.
- Exemplos para BLOQUEAR: 
  * Número de telefone (8-12 dígitos) MESMO QUE disfarçado em frase ("993912083 motivos")
  * Menção a PIX + intenção de compartilhar ("preciso do seu pix", "meu pix é")
  * E-mail, URL, @handle, menção explícita a apps com instrução de contato
- **CRÍTICO**: Sequência de 8-11 dígitos consecutivos = SEMPRE BLOQUEAR (é número de telefone brasileiro)
- Username suspeito + números NAS MENSAGENS ATUAIS/RECENTES (e a mensagem atual possui parte do padrão) = BLOQUEAR + SINALIZAR.

✅ PERMITIDO (não bloquear):
- Palavras genéricas sem detalhes de contato (ex.: "número", "numero", "rede social", "contato", "whatsapp" sem número/handle/link).
- "3 projetos", "5 dias", "10 horas"

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
              ? `Analise esta imagem e mensagem: "${content}"${contextMessages}\n\nIMPORTANTE: Verifique se a imagem contém informações de contato como telefones, usernames de redes sociais, QR codes, ou qualquer tentativa de compartilhar contatos.`
              : `Analise esta imagem:${contextMessages}\n\nIMPORTANTE: Verifique se a imagem contém informações de contato como telefones, usernames de redes sociais, QR codes, ou qualquer tentativa de compartilhar contatos.`
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