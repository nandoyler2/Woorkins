const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ approved: false, reason: 'URL da imagem não fornecida' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ approved: false, reason: 'Sistema de moderação temporariamente indisponível' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const moderationPrompt = `Você é um moderador EXTREMAMENTE RIGOROSO de fotos de perfil para uma plataforma profissional brasileira.

REGRAS ABSOLUTAS - BLOQUEAR IMEDIATAMENTE:

🚫 CONTEÚDO SEXUAL/ADULTO:
- Nudez total ou parcial
- Roupas íntimas ou reveladoras
- Poses sugestivas ou sensuais
- Conteúdo pornográfico de qualquer tipo

🚫 NÃO É PESSOA REAL:
- Desenhos, ilustrações, cartoons, anime
- Avatares digitais, personagens 3D, CGI
- Logotipos, símbolos, marcas
- Animais sozinhos (sem pessoa visível)
- Objetos, paisagens, lugares
- Memes, prints de tela
- Fotos muito escuras onde não dá para ver o rosto
- Silhuetas ou sombras

🚫 ROUPAS E APRESENTAÇÃO NÃO PROFISSIONAL:
- Camisas regata, tops, blusas de alça
- Roupas de praia (biquíni, sunga, maiô)
- Roupas íntimas ou muito reveladoras
- Roupas muito desleixadas, rasgadas ou sujas
- Sem camisa ou torso nu

🚫 QUALIDADE E CONTEXTO INADEQUADOS:
- Fotos muito desfocadas ou borradas
- Resolução muito baixa que impede identificação
- Fotos claramente em festas, bares, baladas (com bebidas alcoólicas, ambiente de festa)
- Selfies em banheiros com espelhos sujos
- Fundos extremamente bagunçados ou inadequados

✅ APROVAR:
- Foto REAL e CLARA de uma PESSOA
- Rosto da pessoa VISÍVEL e IDENTIFICÁVEL
- Boa iluminação e boa resolução
- Vestimenta APRESENTÁVEL: camisetas limpas, polos, camisas, blusas, blazers são aceitos
- Pessoa está apresentável e com postura adequada
- Ambiente pode ser interno ou externo, desde que a pessoa esteja bem apresentada
- Foto profissional ou casual-profissional (tipo LinkedIn, foto corporativa, ou foto apresentável)

🔍 ANÁLISE RIGOROSA:
Analise CUIDADOSAMENTE a imagem fornecida.

Responda APENAS com um JSON válido no formato:
{
  "approved": true/false,
  "reason": "Explicação específica"
}

EXEMPLOS DE RESPOSTAS:

Desenho/Ilustração:
{
  "approved": false,
  "reason": "Esta é uma ilustração/desenho. Você precisa enviar uma FOTO REAL sua mostrando seu rosto claramente com vestimenta profissional."
}

Logo/Objeto:
{
  "approved": false,
  "reason": "Esta imagem mostra um objeto/logo. Você precisa enviar uma FOTO REAL sua mostrando seu rosto claramente com vestimenta profissional."
}

Foto muito escura ou baixa qualidade:
{
  "approved": false,
  "reason": "A qualidade da foto está inadequada (muito escura, desfocada ou baixa resolução). Por favor, envie uma foto clara, bem iluminada e profissional."
}

Roupa inadequada:
{
  "approved": false,
  "reason": "A vestimenta não é apropriada para uma plataforma profissional. Por favor, use roupas formais como camisa, blusa social ou blazer. Evite camisas regata, tops, roupas de praia ou muito informais."
}

Contexto inadequado:
{
  "approved": false,
  "reason": "O contexto da foto não é profissional (festa, praia, ambiente informal). Por favor, envie uma foto em ambiente neutro ou profissional, tipo foto corporativa ou LinkedIn."
}

Conteúdo sexual:
{
  "approved": false,
  "reason": "Conteúdo inadequado detectado. Por favor, envie uma foto de perfil apropriada e profissional com vestimenta formal."
}

Foto válida:
{
  "approved": true,
  "reason": "Foto de perfil aprovada!"
}

SEJA EXTREMAMENTE RIGOROSO. Em caso de QUALQUER dúvida, BLOQUEIE.`;

    console.log('Calling Lovable AI for image moderation...');

    const moderationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: moderationPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!moderationResponse.ok) {
      const errorText = await moderationResponse.text();
      console.error('Lovable AI API error:', errorText);
      throw new Error('Erro ao moderar imagem');
    }

    const moderationData = await moderationResponse.json();
    console.log('Moderation response:', moderationData);

    const aiResponse = moderationData.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON response
    let result;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                       aiResponse.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      // If parsing fails, be safe and reject
      result = {
        approved: false,
        reason: 'Não foi possível validar a imagem. Por favor, tente outra foto mostrando claramente seu rosto.'
      };
    }

    console.log('Final moderation result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error in moderate-profile-photo:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        approved: false, 
        reason: 'Erro ao processar imagem. Tente novamente.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
