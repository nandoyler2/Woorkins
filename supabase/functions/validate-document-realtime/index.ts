import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, documentSide } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Validating ${documentSide} in real-time...`);

    // Real-time validation using AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `VALIDAÇÃO EM TEMPO REAL - SEJA MUITO GENEROSO!

Para documento ${documentSide}:

CRITÉRIOS LENIENTES:
1. Documento visível no enquadramento? ✓
2. Texto minimamente legível? ✓ (IGNORE brilho/sombra leve)
3. Campos principais visíveis?
   - FRENTE: Nome, CPF, Foto, RG/CNH
   - VERSO: Qualquer informação visível

MARQUE isValid=true SE:
- Conseguir ver QUALQUER informação no documento
- Mesmo com brilho, sombra, documento velho
- Foco razoável (não precisa ser perfeito)

MARQUE isValid=false APENAS SE:
- Documento completamente fora do quadro
- Totalmente desfocado (nada legível)
- Escuro demais (preto total)

RETORNE JSON:
{
  "isValid": true,
  "quality": "good",
  "issues": [],
  "suggestions": [],
  "readableFields": {
    "name": true,
    "cpf": true,
    "photo": true,
    "documentNumber": true
  }
}

LEMBRE: Seja GENEROSO! Aprove se der pra ver algo.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this ${documentSide} of a Brazilian identity document in real-time. Tell me if it's good enough to capture or what needs to be improved.`
              },
              {
                type: 'image_url',
                image_url: { url: imageBase64 }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI validation error:', errorText);
      throw new Error(`AI validation failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not extract JSON from response:', content);
      throw new Error('Invalid response format');
    }

    const validationResult = JSON.parse(jsonMatch[0]);
    console.log('Real-time validation result:', validationResult);

    return new Response(JSON.stringify(validationResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isValid: false,
        quality: 'poor',
        issues: ['Erro ao validar documento'],
        suggestions: ['Tente novamente']
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
