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

    // PRIMEIRA ANÁLISE: Identificar qual imagem é frente e qual é verso
    console.log('Identifying document sides...');
    const identificationAnalysis = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                text: `IDENTIFICAÇÃO DE LADO DO DOCUMENTO

Analise estas duas imagens e identifique qual é a FRENTE e qual é o VERSO de um documento de identidade brasileiro (RG ou CNH).

CARACTERÍSTICAS DA FRENTE:
- Foto da pessoa
- Nome completo
- CPF
- Data de nascimento
- RG ou número da CNH

CARACTERÍSTICAS DO VERSO:
- Sem foto da pessoa
- Informações complementares
- Espaço para digitais ou observações

RESPONDA EM JSON:
{
  "firstImageIsFront": true ou false,
  "confidence": "high" ou "medium" ou "low",
  "reasoning": "explicação breve"
}`
              },
              {
                type: 'image_url',
                image_url: { url: frontBase64 }
              },
              {
                type: 'image_url',
                image_url: { url: backBase64 }
              }
            ]
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!identificationAnalysis.ok) {
      throw new Error(`Identification analysis failed: ${identificationAnalysis.status}`);
    }

    const identificationResult = await identificationAnalysis.json();
    const identificationData = JSON.parse(identificationResult.choices[0].message.content);
    
    console.log('=== IDENTIFICATION RESULT ===');
    console.log('First image is front:', identificationData.firstImageIsFront);
    console.log('Confidence:', identificationData.confidence);
    console.log('Reasoning:', identificationData.reasoning);
    console.log('=== END IDENTIFICATION ===');

    // Determinar qual base64 usar para cada lado
    const actualFrontBase64 = identificationData.firstImageIsFront ? frontBase64 : backBase64;
    const actualBackBase64 = identificationData.firstImageIsFront ? backBase64 : frontBase64;
    const actualFrontUrl = identificationData.firstImageIsFront ? frontImageUrl : backImageUrl;
    const actualBackUrl = identificationData.firstImageIsFront ? backImageUrl : frontImageUrl;

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

INSTRUÇÕES CRÍTICAS PARA CPF:
- Procure TODOS os números no documento
- O CPF pode estar em QUALQUER parte do documento (frente ou campos adicionais)
- Aceite CPF com ou sem formatação (XXX.XXX.XXX-XX ou XXXXXXXXXXX)
- Se ver 11 dígitos numéricos, EXTRAIA como CPF
- Seja MUITO CUIDADOSO para não perder nenhum dígito
- Se o CPF estiver parcialmente legível, tente ao máximo identificar todos os 11 dígitos

INSTRUÇÕES DE LEITURA:
1. Identifique: RG ou CNH
2. EXTRAIA OS DADOS com MÁXIMA precisão:
   - Nome completo (exatamente como está escrito)
   - CPF (TODOS os 11 dígitos - pode ter formatação)
   - Data de nascimento (DD/MM/AAAA)
   - Número do documento
   - RG (se houver)
   - Órgão emissor e UF

3. AVALIE A QUALIDADE (seja GENEROSO):
   - Documentos antigos são NORMAIS e devem ser aceitos
   - Brilho leve é ACEITÁVEL
   - Foco levemente reduzido é ACEITÁVEL
   - Marque isReadable=false APENAS se REALMENTE impossível ler

RESPONDA EM JSON:
{
  "documentType": "RG" ou "CNH",
  "extractedData": {
    "fullName": "NOME COMPLETO EXTRAÍDO EXATAMENTE",
    "cpf": "12345678901 ou 123.456.789-01",
    "birthDate": "DD/MM/AAAA",
    "documentNumber": "número do documento",
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
                  image_url: { url: actualFrontBase64 }
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
                image_url: { url: actualBackBase64 }
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
    let extractedCPF = frontData.extractedData?.cpf || '';
    const extractedBirthDate = frontData.extractedData?.birthDate || '';

    console.log('=== EXTRACTED DATA DEBUG ===');
    console.log('Raw Name:', extractedName);
    console.log('Raw CPF (original):', extractedCPF);
    console.log('Raw Birth Date:', extractedBirthDate);
    console.log('Registered Name:', registeredName);
    console.log('Registered CPF:', registeredCPF);
    
    // Normalizar CPF extraído - remover TUDO que não é dígito
    const normalizedExtractedCPF = extractedCPF.replace(/\D/g, '');
    const normalizedRegisteredCPF = registeredCPF.replace(/\D/g, '');
    
    console.log('Normalized Extracted CPF (after cleanup):', normalizedExtractedCPF);
    console.log('Normalized Registered CPF:', normalizedRegisteredCPF);
    console.log('CPF Length:', normalizedExtractedCPF.length);
    
    // Normalizar nomes
    const normalizedExtractedName = extractedName.toLowerCase().trim();
    const normalizedRegisteredName = registeredName.toLowerCase().trim();
    
    console.log('Normalized Extracted Name:', normalizedExtractedName);
    console.log('Normalized Registered Name:', normalizedRegisteredName);
    console.log('=== END EXTRACTED DATA DEBUG ===');

    // Verificar se dados são válidos - CPF aceita 11 dígitos OU mais (para documentos que mostram CPF completo)
    const isValidName = extractedName && 
                        extractedName.length > 5 && 
                        !extractedName.toLowerCase().includes('n/a') &&
                        !extractedName.toLowerCase().includes('não identificado');
    
    // CPF é válido se tem pelo menos 11 dígitos numéricos consecutivos
    const isValidCPF = normalizedExtractedCPF && 
                       normalizedExtractedCPF.length >= 11 && 
                       /\d{11}/.test(normalizedExtractedCPF);
    
    const isValidBirthDate = extractedBirthDate && 
                             !extractedBirthDate.toLowerCase().includes('n/a') &&
                             /\d{2}\/\d{2}\/\d{4}/.test(extractedBirthDate);

    console.log('=== VALIDATION FLAGS ===');
    console.log('Is Valid Name:', isValidName);
    console.log('Is Valid CPF:', isValidCPF);
    console.log('Is Valid Birth Date:', isValidBirthDate);
    console.log('=== END VALIDATION FLAGS ===');

    // Comparar dados quando válidos
    // Para CPF, pegar apenas os primeiros 11 dígitos se houver mais
    const cpfToCompare = normalizedExtractedCPF.substring(0, 11);
    const cpfMatches = isValidCPF && cpfToCompare === normalizedRegisteredCPF;
    
    console.log('=== CPF COMPARISON ===');
    console.log('CPF to compare (first 11 digits):', cpfToCompare);
    console.log('Registered CPF:', normalizedRegisteredCPF);
    console.log('CPF Matches:', cpfMatches);
    console.log('=== END CPF COMPARISON ===');
    
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
        name: formatName(extractedName),
        cpf: cpfToCompare, // Usar apenas os 11 primeiros dígitos
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
        updates.full_name = formatName(extractedName);
      }

      if (extractedBirthDate) {
        const [day, month, year] = extractedBirthDate.split('/');
        if (day && month && year) {
          updates.birth_date = `${year}-${month}-${day}`;
        }
      }

      if (cpfToCompare && cpfToCompare.length === 11) {
        updates.cpf = cpfToCompare;
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
        document_front_url: actualFrontUrl,
        document_back_url: actualBackUrl,
        selfie_url: null,
        verification_status: verificationStatus,
        verification_result: result,
        ai_analysis: result.aiAnalysis,
        extracted_name: formatName(extractedName),
        extracted_cpf: cpfToCompare,
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

// Helper function to format names properly
function formatName(name: string): string {
  if (!name) return '';
  
  const lowercaseWords = ['de', 'da', 'do', 'das', 'dos', 'e'];
  
  return name
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Always capitalize first word, otherwise check if it's a lowercase word
      if (index === 0 || !lowercaseWords.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
}

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
