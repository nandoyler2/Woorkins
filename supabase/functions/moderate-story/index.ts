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
    const { mediaBase64, textContent, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Moderating story content:', { type, hasMedia: !!mediaBase64, hasText: !!textContent });

    // Construir mensagens para o AI
    const messages: any[] = [
      {
        role: 'system',
      content: `Você é um moderador de conteúdo profissional. Analise o conteúdo e responda APENAS com JSON no formato:
{
  "approved": boolean,
  "reason": "motivo da rejeição em português claro e direto, OU 'Conteúdo aprovado'",
  "severity": "low" | "medium" | "high",
  "categories": ["categoria1", "categoria2"]
}

REJEITE e explique claramente quando detectar:
- Pornografia ou nudez explícita → "Conteúdo sexual explícito não é permitido"
- Violência gráfica → "Conteúdo violento não é permitido"
- Discurso de ódio ou preconceito → "Discurso ofensivo ou discriminatório não é permitido"
- Informações sensíveis (CPF, cartões) → "Não compartilhe dados pessoais sensíveis"
- Spam ou conteúdo enganoso → "Conteúdo promocional excessivo ou enganoso não é permitido"

APROVE conteúdo profissional, educativo, artístico apropriado e conteúdo cotidiano normal.`
      }
    ];

    // Adicionar conteúdo para análise
    if (type === 'text') {
      messages.push({
        role: 'user',
        content: `Analise este texto: "${textContent}"`
      });
    } else if (mediaBase64) {
      // Para imagem/vídeo com possível texto
      const userContent: any[] = [];
      
      if (textContent) {
        userContent.push({
          type: 'text',
          text: `Analise esta imagem/vídeo${textContent ? ` com o texto: "${textContent}"` : ''}`
        });
      } else {
        userContent.push({
          type: 'text',
          text: 'Analise esta imagem/vídeo'
        });
      }

      userContent.push({
        type: 'image_url',
        image_url: {
          url: mediaBase64.startsWith('data:') ? mediaBase64 : `data:image/jpeg;base64,${mediaBase64}`
        }
      });

      messages.push({
        role: 'user',
        content: userContent
      });
    }

    // Chamar Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            approved: false, 
            reason: 'Sistema de moderação temporariamente indisponível. Tente novamente em alguns instantes.',
            severity: 'low',
            categories: ['rate_limit']
          }), 
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            approved: false, 
            reason: 'Sistema de moderação temporariamente indisponível.',
            severity: 'low',
            categories: ['payment_required']
          }), 
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';

    console.log('AI Response:', aiResponse);

    // Parsear resposta JSON do AI
    let moderationResult;
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        moderationResult = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: se não conseguir parsear, aprovar por padrão
        console.warn('Could not parse AI response as JSON:', aiResponse);
        moderationResult = {
          approved: true,
          reason: 'Conteúdo aprovado',
          severity: 'low',
          categories: []
        };
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      moderationResult = {
        approved: true,
        reason: 'Conteúdo aprovado',
        severity: 'low',
        categories: []
      };
    }

    console.log('Moderation result:', moderationResult);

    return new Response(
      JSON.stringify(moderationResult),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in moderate-story function:', error);
    return new Response(
      JSON.stringify({ 
        approved: false, 
        reason: 'Erro ao verificar conteúdo. Tente novamente.',
        severity: 'low',
        categories: ['error']
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
