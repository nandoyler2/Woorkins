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

    const moderationPrompt = `Você é um moderador de fotos de perfil para uma plataforma brasileira.

REGRAS - BLOQUEAR APENAS:

🚫 CONTEÚDO SEXUAL/INADEQUADO:
- Nudez total ou parcial
- Roupas íntimas (sutiã, cueca, lingerie)
- Poses sugestivas ou sensuais
- Conteúdo pornográfico ou explícito de qualquer tipo

🚫 NÃO É PESSOA REAL:
- Desenhos, ilustrações, cartoons, anime
- Avatares digitais, personagens 3D, CGI
- Logotipos, símbolos, marcas
- Animais sozinhos (sem pessoa visível)
- Objetos, paisagens, lugares
- Memes, prints de tela

🚫 QUALIDADE MUITO BAIXA:
- Fotos extremamente escuras onde não dá para ver o rosto
- Fotos muito desfocadas/borradas que impedem identificação
- Resolução muito baixa (pixelizada demais)
- Silhuetas ou sombras (rosto não visível)

✅ APROVAR:
- Foto REAL e CLARA de uma PESSOA
- Rosto da pessoa VISÍVEL e IDENTIFICÁVEL
- Qualidade razoável (não precisa ser perfeita)
- Pessoa está VESTIDA adequadamente (qualquer roupa casual normal é OK: camiseta, polo, camisa, blusa, etc)
- Selfies casuais são OK desde que mostrem o rosto claramente
- Ambiente casual é OK (não precisa ser profissional)

IMPORTANTE: 
- Camisetas, polos e roupas casuais normais são APROVADAS
- Fotos casuais/selfies são OK desde que mostrem bem o rosto
- Seja razoável - a pessoa só precisa estar vestida e o rosto precisa estar visível
- Só bloqueie conteúdo realmente inadequado (nudez, sexual, não-pessoa, qualidade péssima)

Responda APENAS com um JSON válido no formato:
{
  "approved": true/false,
  "reason": "Explicação específica"
}

EXEMPLOS DE RESPOSTAS:

Desenho/Ilustração:
{
  "approved": false,
  "reason": "Esta é uma ilustração/desenho. Você precisa enviar uma FOTO REAL sua mostrando seu rosto claramente."
}

Logo/Objeto:
{
  "approved": false,
  "reason": "Esta imagem mostra um objeto/logo. Você precisa enviar uma FOTO REAL sua mostrando seu rosto claramente."
}

Foto muito escura ou qualidade péssima:
{
  "approved": false,
  "reason": "A qualidade da foto está muito baixa (muito escura, desfocada ou pixelizada). Por favor, envie uma foto mais clara onde seu rosto seja visível."
}

Conteúdo sexual/nudez:
{
  "approved": false,
  "reason": "Conteúdo inadequado detectado. Por favor, envie uma foto apropriada onde você esteja vestido(a) e com o rosto visível."
}

Foto válida (casual OK):
{
  "approved": true,
  "reason": "Foto de perfil aprovada!"
}`;

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
