import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      frontImageUrl, 
      backImageUrl, 
      profileId,
      registeredName,
      registeredCPF
    } = await req.json();

    if (!frontImageUrl || !backImageUrl) {
      throw new Error('frontImageUrl e backImageUrl são obrigatórios');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Buscar as imagens e converter para base64
    const [frontResponse, backResponse] = await Promise.all([
      fetch(frontImageUrl),
      fetch(backImageUrl)
    ]);

    const [frontBlob, backBlob] = await Promise.all([
      frontResponse.blob(),
      backResponse.blob()
    ]);

    const frontBase64 = await blobToBase64(frontBlob);
    const backBase64 = await blobToBase64(backBlob);

    // Análise inteligente do documento (frente)
    console.log('Analyzing front document...');
    const frontAnalysis = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                text: `ANÁLISE DETALHADA DE DOCUMENTO BRASILEIRO - FRENTE

Analise este documento de identidade brasileiro (RG ou CNH) e extraia TODAS as informações visíveis.

INSTRUÇÕES DE LEITURA:
1. Identifique: RG ou CNH
2. EXTRAIA OS DADOS com precisão:
   - Nome completo
   - CPF (11 dígitos, apenas números)
   - Data de nascimento (DD/MM/AAAA)
   - Número do documento
   - RG (se houver)
   - Órgão emissor e UF

3. AVALIE A QUALIDADE:
   - Legibilidade geral
   - Presença de brilho ou sombras
   - Idade aparente do documento
   - Se é documento físico ou screenshot

RESPONDA EM JSON:
{
  "documentType": "RG" ou "CNH",
  "extractedData": {
    "fullName": "NOME COMPLETO EXTRAÍDO",
    "cpf": "12345678901",
    "birthDate": "28/03/1996",
    "documentNumber": "número do doc",
    "rg": "RG se houver",
    "issuer": "SSP-XX"
  },
  "quality": {
    "isReadable": true/false,
    "hasGlare": true/false,
    "hasShadows": true/false,
    "isOldDocument": true/false
  },
  "validation": {
    "isPhysicalDocument": true/false,
    "hasAlteration": false,
    "details": "explicação"
  }
}`
              },
              {
                type: 'image_url',
                image_url: { url: frontBase64 }
              }
            ]
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!frontAnalysis.ok) {
      throw new Error(`Front analysis failed: ${frontAnalysis.status}`);
    }

    const frontResult = await frontAnalysis.json();
    const frontData = JSON.parse(frontResult.choices[0].message.content);

    // Análise do verso
    console.log('Analyzing back document...');
    const backAnalysis = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                text: `ANÁLISE DO VERSO DO DOCUMENTO

Analise o verso do documento e verifique:
1. Se está legível
2. Se parece autêntico
3. Se há informações adicionais relevantes

RESPONDA EM JSON:
{
  "validation": {
    "isReadable": true/false,
    "reason": "motivo se false"
  },
  "authenticity": {
    "isAuthentic": true/false,
    "details": "explicação"
  },
  "additionalInfo": "qualquer informação extra relevante"
}`
              },
              {
                type: 'image_url',
                image_url: { url: backBase64 }
              }
            ]
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!backAnalysis.ok) {
      throw new Error(`Back analysis failed: ${backAnalysis.status}`);
    }

    const backResult = await backAnalysis.json();
    const backData = JSON.parse(backResult.choices[0].message.content);

    // Validação final
    const extractedName = frontData.extractedData?.fullName || '';
    const extractedCPF = frontData.extractedData?.cpf || '';
    const extractedBirthDate = frontData.extractedData?.birthDate || '';

    console.log('=== CPF COMPARISON DEBUG ===');
    console.log('Extracted CPF (raw):', extractedCPF);
    console.log('Registered CPF (raw):', registeredCPF);
    
    const normalizedExtractedCPF = extractedCPF.replace(/[.\-\s]/g, '');
    const normalizedRegisteredCPF = registeredCPF.replace(/[.\-\s]/g, '');
    
    console.log('Normalized Extracted CPF:', normalizedExtractedCPF);
    console.log('Normalized Registered CPF:', normalizedRegisteredCPF);
    
    const cpfMatches = normalizedExtractedCPF === normalizedRegisteredCPF;
    console.log('CPF Matches:', cpfMatches);
    console.log('=== END CPF DEBUG ===');

    const normalizedExtractedName = extractedName.toLowerCase().trim();
    const normalizedRegisteredName = registeredName.toLowerCase().trim();
    const nameMatches = normalizedExtractedName.includes(normalizedRegisteredName) || 
                       normalizedRegisteredName.includes(normalizedExtractedName);

    let verificationStatus = 'rejected';
    let rejectionReasons = [];

    // Validações
    if (!extractedName || extractedName.length < 3) {
      rejectionReasons.push('Nome não foi extraído. Envie uma imagem mais nítida.');
    }
    
    if (frontData.quality?.isReadable === false) {
      rejectionReasons.push('Documento ilegível. Tire foto com melhor iluminação.');
    }
    
    if (frontData.validation?.isPhysicalDocument === false) {
      rejectionReasons.push('Use o documento físico original, não screenshot.');
    }
    
    if (frontData.validation?.hasAlteration) {
      rejectionReasons.push('Documento parece ter sido alterado.');
    }
    
    if (backData.validation?.isReadable === false) {
      rejectionReasons.push('Verso do documento ilegível.');
    }
    
    if (backData.authenticity?.isAuthentic === false) {
      rejectionReasons.push('Documento não parece autêntico.');
    }
    
    // Só rejeita por CPF se extraiu E não dá match (com pelo menos 11 dígitos)
    if (normalizedExtractedCPF.length === 11 && normalizedRegisteredCPF.length === 11 && !cpfMatches) {
      rejectionReasons.push('CPF do documento não corresponde ao cadastro.');
    }
    
    // Só rejeita por nome se ambos estão preenchidos E não dá match
    if (normalizedExtractedName.length > 3 && normalizedRegisteredName.length > 3 && !nameMatches) {
      rejectionReasons.push('Nome do documento não corresponde ao cadastro.');
    }

    // Aprovar se não houver motivos para rejeitar
    if (rejectionReasons.length === 0) {
      verificationStatus = 'approved';
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const result = {
      status: verificationStatus,
      extractedData: {
        name: extractedName,
        cpf: normalizedExtractedCPF,
        birthDate: extractedBirthDate,
        documentType: frontData.documentType,
        documentNumber: frontData.extractedData?.documentNumber,
        rg: frontData.extractedData?.rg,
        issuer: frontData.extractedData?.issuer
      },
      validation: {
        cpfMatches,
        nameMatches
      },
      aiAnalysis: {
        front: frontData,
        back: backData
      },
      rejectionReasons: rejectionReasons.length > 0 ? rejectionReasons : null
    };

    // Se aprovado, atualizar perfil e inserir registro de verificação
    if (verificationStatus === 'approved') {
      const updates: any = {
        document_verified: true,
        document_verification_status: 'approved'
      };

      if (extractedName) {
        updates.full_name = extractedName;
      }

      if (extractedBirthDate) {
        const [day, month, year] = extractedBirthDate.split('/');
        if (day && month && year) {
          updates.birth_date = `${year}-${month}-${day}`;
        }
      }

      if (normalizedExtractedCPF) {
        updates.cpf = normalizedExtractedCPF;
      }

      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId);
    }

    // Inserir registro de verificação (usando service_role para bypass RLS)
    await supabase
      .from('document_verifications')
      .insert({
        profile_id: profileId,
        document_front_url: frontImageUrl,
        document_back_url: backImageUrl,
        selfie_url: null,
        verification_status: verificationStatus,
        verification_result: result,
        ai_analysis: result.aiAnalysis,
        extracted_name: extractedName,
        extracted_cpf: normalizedExtractedCPF,
        extracted_birth_date: extractedBirthDate ? (() => {
          const [day, month, year] = extractedBirthDate.split('/');
          return `${year}-${month}-${day}`;
        })() : null
      });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'rejected',
        rejectionReasons: ['Erro ao processar documentos. Tente novamente.']
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to convert Blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  // Process in chunks to avoid stack overflow
  const chunkSize = 8192;
  let binary = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  const base64 = btoa(binary);
  return `data:${blob.type};base64,${base64}`;
}
