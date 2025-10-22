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

    const moderationPrompt = `Você é um moderador de fotos de capa para uma plataforma profissional brasileira.

REGRAS DE MODERAÇÃO PARA FOTOS DE CAPA:

🚫 BLOQUEAR APENAS:
- Nudez total ou parcial
- Conteúdo pornográfico ou sexual explícito
- Roupas íntimas ou muito reveladoras em contexto sexual
- Poses sexualmente sugestivas ou explícitas
- Conteúdo violento, ofensivo ou de ódio
- Imagens claramente ilegais

✅ PERMITIR:
- Logos, marcas, símbolos empresariais
- Paisagens, natureza, lugares
- Objetos, produtos, designs
- Arte, ilustrações, desenhos, pinturas
- Fotos profissionais de qualquer tipo
- Fotos pessoais em contextos apropriados
- Banners, designs gráficos
- Fotos de equipe, eventos profissionais
- Qualquer imagem apropriada e não-pornográfica

🔍 ANÁLISE:
Analise a imagem fornecida verificando APENAS se há conteúdo pornográfico/sexual explícito ou conteúdo violento/ilegal.

Responda APENAS com um JSON válido no formato:
{
  "approved": true/false,
  "reason": "Explicação específica"
}

EXEMPLOS DE RESPOSTAS:

Conteúdo pornográfico/sexual:
{
  "approved": false,
  "reason": "Conteúdo sexual explícito detectado. Por favor, use uma imagem apropriada para foto de capa."
}

Conteúdo violento/ofensivo:
{
  "approved": false,
  "reason": "Conteúdo inadequado detectado. Por favor, use uma imagem apropriada e profissional."
}

Logo/Design/Paisagem (OK):
{
  "approved": true,
  "reason": "Foto de capa aprovada!"
}

Foto profissional (OK):
{
  "approved": true,
  "reason": "Foto de capa aprovada!"
}

IMPORTANTE: Seja liberal com aprovações. Bloqueie APENAS conteúdo claramente sexual/pornográfico, violento ou ilegal. Logos, paisagens, designs, arte e fotos profissionais são BEM-VINDOS.`;

    console.log('Calling Lovable AI for cover image moderation...');

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
        max_tokens: 300
      })
    });

    if (!moderationResponse.ok) {
      const errorText = await moderationResponse.text();
      console.error('Lovable AI API error:', errorText);
      throw new Error('Erro ao moderar imagem');
    }

    const moderationData = await moderationResponse.json();
    console.log('Cover moderation response:', moderationData);

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
      // If parsing fails, default to approval for cover photos (be more permissive)
      result = {
        approved: true,
        reason: 'Foto de capa aprovada!'
      };
    }

    console.log('Final cover moderation result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Error in moderate-cover-photo:', errorMessage);
    
    // Be more permissive with errors for cover photos
    return new Response(
      JSON.stringify({ 
        approved: true, 
        reason: 'Foto de capa aprovada!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
