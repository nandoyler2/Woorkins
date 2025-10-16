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

    console.log('Starting document verification for profile:', profileId);

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

    // Validação final - Extrair dados
    const extractedName = frontData.extractedData?.fullName || '';
    const extractedCPF = frontData.extractedData?.cpf || '';
    const extractedBirthDate = frontData.extractedData?.birthDate || '';

    console.log('=== EXTRACTED DATA DEBUG ===');
    console.log('Raw Name:', extractedName);
    console.log('Raw CPF:', extractedCPF);
    console.log('Raw Birth Date:', extractedBirthDate);
    console.log('Registered Name:', registeredName);
    console.log('Registered CPF:', registeredCPF);
    
    // Normalizar dados extraídos
    const normalizedExtractedCPF = extractedCPF.replace(/[.\-\s]/g, '');
    const normalizedRegisteredCPF = registeredCPF.replace(/[.\-\s]/g, '');
    const normalizedExtractedName = extractedName.toLowerCase().trim();
    const normalizedRegisteredName = registeredName.toLowerCase().trim();
    
    console.log('Normalized Extracted CPF:', normalizedExtractedCPF);
    console.log('Normalized Registered CPF:', normalizedRegisteredCPF);
    console.log('Normalized Extracted Name:', normalizedExtractedName);
    console.log('Normalized Registered Name:', normalizedRegisteredName);
    console.log('=== END EXTRACTED DATA DEBUG ===');

    // Verificar se dados são válidos (não N/A, não vazio, não muito curto)
    const isValidName = extractedName && 
                        extractedName.length > 5 && 
                        extractedName.toLowerCase() !== 'n/a' &&
                        extractedName.toLowerCase() !== 'não identificado';
    
    const isValidCPF = normalizedExtractedCPF && 
                       normalizedExtractedCPF.length === 11 && 
                       /^\d{11}$/.test(normalizedExtractedCPF);
    
    const isValidBirthDate = extractedBirthDate && 
                             extractedBirthDate.toLowerCase() !== 'n/a' &&
                             /^\d{2}\/\d{2}\/\d{4}$/.test(extractedBirthDate);

    console.log('=== VALIDATION FLAGS ===');
    console.log('Is Valid Name:', isValidName);
    console.log('Is Valid CPF:', isValidCPF);
    console.log('Is Valid Birth Date:', isValidBirthDate);
    console.log('=== END VALIDATION FLAGS ===');

    // Comparar dados quando válidos
    const cpfMatches = isValidCPF && normalizedExtractedCPF === normalizedRegisteredCPF;
    const nameMatches = isValidName && (
      normalizedExtractedName.includes(normalizedRegisteredName) || 
      normalizedRegisteredName.includes(normalizedExtractedName)
    );

    let verificationStatus = 'rejected';
    let rejectionReasons = [];

    // ===== VALIDAÇÕES CRÍTICAS OBRIGATÓRIAS =====
    
    // 1. Nome DEVE ser extraído e válido
    if (!isValidName) {
      rejectionReasons.push('Nome não foi extraído corretamente. Envie foto mais nítida da frente do documento.');
    }
    
    // 2. CPF DEVE ser extraído e válido
    if (!isValidCPF) {
      rejectionReasons.push('CPF não foi extraído corretamente. Verifique se o documento está legível.');
    }
    
    // 3. Data de nascimento DEVE ser extraída e válida
    if (!isValidBirthDate) {
      rejectionReasons.push('Data de nascimento não foi extraída. Envie foto mais clara do documento.');
    }
    
    // 4. Validações de qualidade
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
    
    // ===== VALIDAÇÕES DE CORRESPONDÊNCIA =====
    
    // 5. CPF deve corresponder ao cadastro (só valida se ambos são válidos)
    if (isValidCPF && normalizedRegisteredCPF.length === 11 && !cpfMatches) {
      rejectionReasons.push('CPF do documento não corresponde ao CPF cadastrado.');
    }
    
    // 6. Nome deve corresponder ao cadastro (só valida se ambos são válidos)
    if (isValidName && normalizedRegisteredName.length > 3 && !nameMatches) {
      rejectionReasons.push('Nome do documento não corresponde ao nome cadastrado.');
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

    console.log('Verification completed successfully:', verificationStatus);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Verification error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error
    });
    
    const errorResult = { 
      status: 'rejected',
      rejectionReasons: [
        'Erro ao processar documentos. Tente novamente.',
        error instanceof Error ? error.message : 'Erro desconhecido'
      ],
      extractedData: null,
      validation: null,
      aiAnalysis: null
    };
    
    return new Response(
      JSON.stringify(errorResult), 
      {
        status: 200, // Return 200 with rejected status instead of 500
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
