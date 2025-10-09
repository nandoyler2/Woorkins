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
    const { content, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurado');
    }

    const systemPrompt = `Você é um moderador de conteúdo para a plataforma Woorkins.

Analise o conteúdo e identifique se contém:
- Linguagem ofensiva, preconceituosa ou discriminatória
- Spam ou conteúdo promocional não autorizado
- Informações falsas ou enganosas
- Conteúdo sexual inapropriado
- Violência ou incitação ao ódio
- Dados pessoais sensíveis (CPF, cartão de crédito, etc)

Responda APENAS com um JSON no formato:
{
  "approved": true/false,
  "reason": "motivo da rejeição se aplicável",
  "severity": "low/medium/high",
  "categories": ["categoria1", "categoria2"]
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
          { role: 'user', content: `Tipo: ${type}\n\nConteúdo: ${content}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        // Em caso de rate limit, aprovar por padrão mas logar
        console.warn('AI moderation unavailable, approving by default');
        return new Response(JSON.stringify({ 
          approved: true, 
          reason: 'Moderação automática temporariamente indisponível',
          severity: 'low',
          categories: []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Parse JSON response
    const moderationResult = JSON.parse(aiResponse);

    return new Response(JSON.stringify(moderationResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in moderate-content:', error);
    // Em caso de erro, aprovar por padrão para não bloquear usuários
    return new Response(
      JSON.stringify({ 
        approved: true, 
        reason: 'Erro na moderação automática',
        severity: 'low',
        categories: []
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});