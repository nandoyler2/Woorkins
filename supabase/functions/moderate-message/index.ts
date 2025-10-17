const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, recentMessages = [], imageUrl, isPaid = false, profileId, conversationType, conversationId, fileName, fileType } = await req.json();
    
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

Sua missão é detectar e BLOQUEAR QUALQUER tentativa de:
1. Compartilhar informações de contato pessoal
2. Enviar conteúdo ofensivo, agressivo ou inapropriado
3. Usar linguagem abusiva, palavrões ou ataques pessoais
4. Enviar conteúdo sexual, pornográfico ou inadequado
5. Enviar tentativas de burla em múltiplas mensagens
6. Enviar imagens que contenham contatos, pornografia ou conteúdo ofensivo

🚨 ATENÇÃO ESPECIAL: DETECÇÃO DE CONTEÚDO OFENSIVO E IMPRÓPRIO

**BLOQUEAR IMEDIATAMENTE:**

1. **PALAVRÕES E LINGUAGEM OFENSIVA** (incluindo variações, disfarces e eufemismos):
   - Xingamentos diretos ou indiretos
   - Palavras de baixo calão (qualquer forma ou variação)
   - Insultos raciais, sexuais, ou discriminatórios
   - Ameaças ou intimidação
   - Linguagem agressiva ou hostil
   - Assédio de qualquer tipo

2. **CONTEÚDO SEXUAL E PORNOGRÁFICO**:
   - Imagens com nudez ou conteúdo sexual explícito
   - Textos com conteúdo sexual explícito
   - Insinuações ou propostas sexuais
   - Linguagem sexual inapropriada
   - Assédio sexual de qualquer forma

3. **IMAGENS IMPRÓPRIAS**:
   - 🔥 CRÍTICO: Imagens com nudez parcial ou total
   - Imagens com conteúdo sexual ou sugestivo
   - Imagens violentas ou perturbadoras
   - Imagens ofensivas ou discriminatórias
   - Gestos obscenos ou ofensivos

4. **ATAQUES PESSOAIS**:
   - Insultos diretos a outras pessoas
   - Bullying ou cyberbullying
   - Difamação ou calúnia
   - Discriminação de qualquer tipo (raça, gênero, religião, orientação sexual, etc.)

5. **USERNAMES E @HANDLES - BLOQUEIO AUTOMÁTICO**:
   - QUALQUER @ seguido de caracteres (ex: @nandoyler, @usuario, @qualquercoisa)
   - Usernames sem @ mas que pareçam handles de redes sociais
   - "me procura como [nome]", "meu user é", "me acha no"
   - Combinações únicas sem espaço (ex: "nandoyler", "joao_silva123")

6. **E-MAILS - BLOQUEIO RIGOROSO**:
   - usuario@dominio.com
   - Tentativas divididas: "quentemail" + "ponto com" = email
   - "arroba", "at", "@"
   - Menções a serviços: gmail, hotmail, outlook, yahoo
   - "ponto com", "dot com", ".com"

7. **PIX - ATENÇÃO MÁXIMA (Brasil)**:
   - Palavra "pix" em qualquer contexto que indique compartilhamento
   - "meu pix", "chave pix", "pix é", "te passo o pix", "preciso do seu pix"
   - Combinação de "pix" + número/CPF/email/telefone
   - "chave"

8. **Números de telefone** em QUALQUER formato:
   - Padrão: (11) 98765-4321, 11987654321, 11 98765-4321
   - Separado: 1 1 9 8 7 6 5 4 3 2 1
   - Por extenso: "um um nove oito sete", "onze nove oito"
   - Disfarçado: "nove.oito.sete.seis.cinco"
   - **NÚMEROS DISFARÇADOS EM FRASES**: "993912083 motivos", "11999887766 razões"
   - **🚨 CRÍTICO - NÚMEROS CAMUFLADOS**: "tem 993 cavalos e anda a 912 km/h e a 083 segundos" = 993912083
   - **EXTRAIR TODOS OS NÚMEROS**: Se ao juntar TODOS os números da frase formar 8-11 dígitos = TELEFONE
   - Qualquer sequência de 8-11 dígitos MESMO QUE disfarçada em texto normal
   - Código de área + número: "11 9", "21 9", "DDD 9"

9. **Apps de mensagem** (incluindo disfarces):
   - WhatsApp: "whats", "zap", "wpp", "what", "watts", "uats", "wp", "whatsa", "whts"
   - Telegram: "telegram", "telegran", "tg", "telgm", "telegr"
   - Signal, Discord, Messenger, Skype

10. **Redes sociais** (incluindo variações):
    - Instagram: "insta", "ig", "gram", "inst@", "1nsta", "instagr", "instagram"
    - Facebook: "face", "fb", "f@ce", "facebook"
    - Twitter/X: "tt", "twitter", "x"
    - TikTok: "tiktok", "tik tok"
    - LinkedIn: "linkedin", "in", "linked"

11. **Links e URLs**:
    - http, https, www
    - bit.ly, encurtadores
    - dominio.com, .com.br

12. **IMAGENS com informações de contato - ANÁLISE ULTRA RIGOROSA**:
    - 🚨🚨🚨 PRIORIDADE MÁXIMA: NÚMEROS DE TELEFONE EM IMAGENS 🚨🚨🚨
    - **TEXTO SOBREPOSTO**: Qualquer texto com números sobrepostos na imagem (ex: "11 993912083", "11993912083")
    - **NÚMEROS GRANDES E VISÍVEIS**: Especialmente se os números estão em destaque ou centralizados
    - Números visíveis em fotos de pessoas, objetos, telas, documentos
    - Números em banners, cartões, anúncios dentro da imagem
    - Números escritos à mão ou digitados em qualquer parte da imagem
    - Mesmo se o número estiver discretamente posicionado
    - Mesmo se o número aparecer em contexto aparentemente inocente
    - Capturas de tela de conversas ou perfis
    - QR codes do WhatsApp ou outras redes
    - Cards de visita ou informações de contato
    - Qualquer imagem que contenha @ (arroba) ou links
    - Informações de contato em cartões, documentos, telas de celular
    - **ESCANEAR TODA A IMAGEM**: Procure atentamente por sequências de 8-11 dígitos em TODAS as áreas da imagem
    - **FORMATOS VARIADOS**: (11) 99999-9999, 11 99999-9999, 11999999999, 11 9 9999 9999, etc.
    - **🔥 CRÍTICO**: Se você ver QUALQUER sequência de 10-11 dígitos na imagem = BLOQUEAR IMEDIATAMENTE
    - **🔥 PORNOGRAFIA/NUDEZ**: Qualquer imagem com nudez, conteúdo sexual ou pornográfico = BLOQUEAR IMEDIATAMENTE
    - **🔥 CONTEÚDO OFENSIVO**: Imagens com violência, gestos obscenos, ou material ofensivo = BLOQUEAR IMEDIATAMENTE

🚨 CRITÉRIOS DE BLOQUEIO E SINALIZAÇÃO:
- Seja EXTREMAMENTE RIGOROSO com conteúdo ofensivo, sexual e imagens impróprias.
- BLOQUEAR IMEDIATAMENTE:
  * Qualquer palavrão ou linguagem ofensiva
  * Qualquer conteúdo sexual ou pornográfico (texto ou imagem)
  * Qualquer ataque pessoal ou discriminação
  * Assédio de qualquer tipo
  * QUALQUER @ seguido de texto (ex: @nandoyler)
  * Partes de email (gmail, hotmail, ponto com, arroba)
  * Sequência de 8-11 dígitos consecutivos NO TEXTO
  * 🔥 IMAGENS: QUALQUER sequência de 8-11 dígitos visível na imagem (mesmo em fotos normais)
  * 🔥 IMAGENS: Números de telefone com DDD brasileiro (11, 21, 81, 85, etc.) seguidos de 8-9 dígitos
  * 🔥 IMAGENS: Mesmo números parcialmente visíveis ou em segundo plano
  * 🔥 IMAGENS: Nudez, pornografia ou conteúdo sexual
  * 🔥 IMAGENS: Violência, gestos obscenos ou conteúdo ofensivo
  * Menção a PIX + intenção de compartilhar
  * E-mail, URL, @handle, menção explícita a apps

✅ PERMITIDO (não bloquear):
- Palavras genéricas sem detalhes (ex: "número", "rede social", "contato")
- "3 projetos", "5 dias", "10 horas"
- Mensagens profissionais e respeitosas sobre o trabalho

📋 IMPORTANTE: SEMPRE forneça um motivo ESPECÍFICO e CLARO quando bloquear:
- Diga exatamente O QUE foi detectado
- Explique POR QUE foi bloqueado
- Se detectou padrão em múltiplas mensagens ou imagens, mencione isso
- Para conteúdo ofensivo, especifique o tipo de violação

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
              ? `Analise esta imagem e mensagem: "${content}"${contextMessages}\n\n🔍🔍🔍 ANÁLISE CRÍTICA DE IMAGEM - ATENÇÃO MÁXIMA 🔍🔍🔍:\n\n⚠️ PRIORIDADE ABSOLUTA:\n1. PROCURE ATENTAMENTE POR NÚMEROS DE TELEFONE NA IMAGEM\n2. Verifique se há TEXTO SOBREPOSTO com números (ex: "11 993912083")\n3. Procure números GRANDES, centralizados ou em destaque\n4. Qualquer sequência de 10-11 dígitos = BLOQUEAR IMEDIATAMENTE\n\nOutras verificações:\n- ESCANEAR TODA A IMAGEM procurando números de telefone (8-11 dígitos)\n- Números com DDD brasileiro: (11) 9XXXX-XXXX, 11 9XXXXXXXX, etc.\n- Números em qualquer formato ou localização na imagem\n- Mesmo em fotos que parecem normais (pessoas, objetos, documentos)\n- @usernames, emails, QR codes, links visíveis\n- Qualquer tentativa de compartilhar contatos`
              : `Analise esta imagem:${contextMessages}\n\n🔍🔍🔍 ANÁLISE CRÍTICA DE IMAGEM - ATENÇÃO MÁXIMA 🔍🔍🔍:\n\n⚠️ PRIORIDADE ABSOLUTA:\n1. PROCURE ATENTAMENTE POR NÚMEROS DE TELEFONE NA IMAGEM\n2. Verifique se há TEXTO SOBREPOSTO com números (ex: "11 993912083")\n3. Procure números GRANDES, centralizados ou em destaque\n4. Qualquer sequência de 10-11 dígitos = BLOQUEAR IMEDIATAMENTE\n\nOutras verificações:\n- ESCANEAR TODA A IMAGEM procurando números de telefone (8-11 dígitos)\n- Números com DDD brasileiro: (11) 9XXXX-XXXX, 11 9XXXXXXXX, etc.\n- Números em qualquer formato ou localização na imagem\n- Mesmo em fotos que parecem normais (pessoas, objetos, documentos)\n- @usernames, emails, QR codes, links visíveis\n- Qualquer tentativa de compartilhar contatos`
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

    const requestBody: any = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        userMessage
      ],
      temperature: 0.1, // Temperatura muito baixa para detecção mais consistente e rigorosa
    };

    // Add modalities for image processing
    if (imageUrl) {
      requestBody.modalities = ["image", "text"];
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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

    // If message is rejected, save to blocked_messages table for admin review
    if (!moderationResult.approved) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && profileId) {
        try {
          // Determine moderation category
          const reason = moderationResult.reason || '';
          let category = 'other';
          
          if (reason.toLowerCase().includes('palavrão') || reason.toLowerCase().includes('ofensiv')) {
            category = 'profanity';
          } else if (reason.toLowerCase().includes('sexual') || reason.toLowerCase().includes('pornográf')) {
            category = 'explicit_content';
          } else if (reason.toLowerCase().includes('contato') || reason.toLowerCase().includes('telefone') || reason.toLowerCase().includes('email')) {
            category = 'contact_sharing';
          } else if (reason.toLowerCase().includes('assédio') || reason.toLowerCase().includes('ataque')) {
            category = 'harassment';
          }
          
          // Save blocked message
          const blockedMessageData = {
            profile_id: profileId,
            conversation_type: conversationType || 'unknown',
            conversation_id: conversationId || null,
            original_content: content || null,
            file_url: imageUrl || null,
            file_name: fileName || null,
            file_type: fileType || null,
            moderation_reason: moderationResult.reason,
            moderation_category: category
          };
          
          const saveResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/blocked_messages`,
            {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify(blockedMessageData)
            }
          );
          
          console.log('Blocked message saved:', saveResponse.ok);
          
          // Aplicar bloqueio progressivo do sistema para violações graves
          if (category === 'profanity' || category === 'explicit_content' || category === 'harassment') {
            try {
              const blockResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/rpc/apply_progressive_system_block`,
                {
                  method: 'POST',
                  headers: {
                    'apikey': SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    p_profile_id: profileId,
                    p_violation_category: category,
                    p_reason: moderationResult.reason
                  })
                }
              );
              
              if (blockResponse.ok) {
                const blockResult = await blockResponse.json();
                console.log('Progressive system block applied:', blockResult);
                
                // Adicionar informação de bloqueio ao resultado da moderação
                if (blockResult && blockResult.length > 0) {
                  const blockInfo = blockResult[0];
                  if (blockInfo.blocked) {
                    moderationResult.systemBlocked = true;
                    moderationResult.blockDurationHours = blockInfo.block_duration_hours;
                    moderationResult.blockedUntil = blockInfo.blocked_until;
                    moderationResult.violationCount = blockInfo.violation_count;
                    moderationResult.blockMessage = blockInfo.block_message;
                  } else if (blockInfo.block_message) {
                    // Mesmo sem bloqueio, adicionar mensagem de aviso
                    moderationResult.warningMessage = blockInfo.block_message;
                    moderationResult.violationCount = blockInfo.violation_count;
                  }
                }
              } else {
                console.error('Failed to apply progressive block:', await blockResponse.text());
              }
            } catch (blockError) {
              console.error('Error applying progressive block:', blockError);
            }
          }
        } catch (error) {
          console.error('Error saving blocked message:', error);
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