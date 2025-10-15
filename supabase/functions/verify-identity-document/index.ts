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
      documentFrontBase64, 
      documentBackBase64, 
      selfieBase64,
      profileId,
      registeredName,
      registeredCPF 
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Análise do documento (frente)
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
                text: `ANÁLISE CRÍTICA DE DOCUMENTO DE IDENTIDADE (RG/CNH) - FRENTE

Você é um especialista em validação de documentos brasileiros. Analise esta imagem de documento de identidade e extraia as informações com MÁXIMA PRECISÃO.

TAREFA:
1. Identifique o tipo de documento (RG ou CNH)
2. Extraia EXATAMENTE as seguintes informações:
   - Nome completo (todos os nomes, exatamente como escrito)
   - CPF (somente números)
   - Data de nascimento (formato DD/MM/AAAA)
   - Número do documento

VALIDAÇÕES OBRIGATÓRIAS:
1. QUALIDADE DA IMAGEM:
   - Foto está nítida e legível?
   - Todas as informações estão visíveis?
   - Há brilho, sombra ou obstrução?
   - A foto foi tirada do documento físico ou é screenshot/foto de tela?

2. AUTENTICIDADE:
   - Há sinais de adulteração, edição digital ou montagem?
   - As fontes e formatação são consistentes com documentos oficiais?
   - Há hologramas, marcas d'água ou elementos de segurança visíveis?
   - As cores e qualidade de impressão são consistentes?

3. FRAUDE:
   - Detecta sinais de falsificação?
   - Há inconsistências visuais (cortes, colagens, sobreposição)?
   - A foto da pessoa parece manipulada?

RESPONDA EM JSON:
{
  "documentType": "RG" ou "CNH",
  "extractedData": {
    "fullName": "nome completo exato",
    "cpf": "apenas números",
    "birthDate": "DD/MM/AAAA",
    "documentNumber": "número"
  },
  "validation": {
    "isReadable": true/false,
    "reason": "motivo se false",
    "isClear": true/false,
    "hasReflections": true/false,
    "isPhysicalDocument": true/false
  },
  "authenticity": {
    "isAuthentic": true/false,
    "hasSuspiciousEdits": true/false,
    "hasSecurityFeatures": true/false,
    "details": "explicação detalhada"
  },
  "fraud": {
    "isFraudulent": true/false,
    "confidence": 0-100,
    "reasons": ["lista de razões se suspeito"]
  }
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: documentFrontBase64
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!frontAnalysis.ok) {
      const errorText = await frontAnalysis.text();
      console.error('Front analysis error:', frontAnalysis.status, errorText);
      throw new Error(`AI analysis failed: ${frontAnalysis.status}`);
    }

    const frontResult = await frontAnalysis.json();
    const frontData = JSON.parse(frontResult.choices[0].message.content);

    // Análise do documento (verso)
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
                text: `ANÁLISE CRÍTICA DE DOCUMENTO DE IDENTIDADE (RG/CNH) - VERSO

Analise o VERSO do documento e verifique:

1. QUALIDADE:
   - Imagem nítida e legível?
   - Informações visíveis?
   
2. AUTENTICIDADE:
   - Elementos de segurança presentes?
   - Formatação oficial?
   - Sinais de adulteração?

3. CONSISTÊNCIA:
   - O verso parece do mesmo documento da frente?
   - Tipo de papel, cores e qualidade são consistentes?

RESPONDA EM JSON:
{
  "validation": {
    "isReadable": true/false,
    "isClear": true/false,
    "reason": "motivo se problema"
  },
  "authenticity": {
    "isAuthentic": true/false,
    "hasSecurityFeatures": true/false,
    "details": "explicação"
  },
  "consistency": {
    "matchesFront": true/false,
    "reason": "explicação"
  }
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: documentBackBase64
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!backAnalysis.ok) {
      const errorText = await backAnalysis.text();
      console.error('Back analysis error:', backAnalysis.status, errorText);
      throw new Error(`AI back analysis failed: ${backAnalysis.status}`);
    }

    const backResult = await backAnalysis.json();
    const backData = JSON.parse(backResult.choices[0].message.content);

    // Comparação de selfie com foto do documento
    console.log('Comparing selfie with document photo...');
    const faceComparison = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                text: `COMPARAÇÃO BIOMÉTRICA FACIAL

Compare a selfie com a foto do documento de identidade.

ANÁLISE OBRIGATÓRIA:
1. CORRESPONDÊNCIA FACIAL:
   - As duas fotos são da mesma pessoa?
   - Características faciais principais coincidem?
   - Idade aparente é compatível?

2. QUALIDADE DA SELFIE:
   - Foto é ao vivo (não screenshot)?
   - Rosto está visível e nítido?
   - Há sinais de máscara, foto impressa ou deepfake?

3. VALIDAÇÃO:
   - Confiança na correspondência (0-100%)
   - É a mesma pessoa?

IMAGENS:
- Primeira imagem: Documento de identidade (com foto)
- Segunda imagem: Selfie atual

RESPONDA EM JSON:
{
  "faceMatch": {
    "isSamePerson": true/false,
    "confidence": 0-100,
    "details": "explicação detalhada da comparação"
  },
  "selfieQuality": {
    "isLivePhoto": true/false,
    "isClear": true/false,
    "hasSpoofing": true/false,
    "reason": "explicação"
  },
  "validation": {
    "approved": true/false,
    "reason": "motivo final"
  }
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: documentFrontBase64
                }
              },
              {
                type: 'image_url',
                image_url: {
                  url: selfieBase64
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!faceComparison.ok) {
      const errorText = await faceComparison.text();
      console.error('Face comparison error:', faceComparison.status, errorText);
      throw new Error(`Face comparison failed: ${faceComparison.status}`);
    }

    const faceResult = await faceComparison.json();
    const faceData = JSON.parse(faceResult.choices[0].message.content);

    // Validações finais
    const extractedName = frontData.extractedData?.fullName || '';
    const extractedCPF = frontData.extractedData?.cpf || '';
    const extractedBirthDate = frontData.extractedData?.birthDate || '';

    // Normalizar CPF (remover pontos e traços)
    const normalizedExtractedCPF = extractedCPF.replace(/[.\-]/g, '');
    const normalizedRegisteredCPF = registeredCPF.replace(/[.\-]/g, '');

    // Verificar se CPF é exatamente igual
    const cpfMatches = normalizedExtractedCPF === normalizedRegisteredCPF;

    // Verificar se nome do documento contém o nome cadastrado (pode ser nome parcial no cadastro)
    const normalizedExtractedName = extractedName.toLowerCase().trim();
    const normalizedRegisteredName = registeredName.toLowerCase().trim();
    
    // Nome pode ser parcial no cadastro, mas deve estar contido no nome completo do documento
    const nameMatches = normalizedExtractedName.includes(normalizedRegisteredName) || 
                       normalizedRegisteredName.includes(normalizedExtractedName);

    // Determinar status final
    let verificationStatus = 'rejected';
    let rejectionReasons = [];

    // Validações
    if (!frontData.validation?.isReadable || !frontData.validation?.isClear) {
      rejectionReasons.push('Documento ilegível ou com má qualidade na frente');
    }
    if (!frontData.validation?.isPhysicalDocument) {
      rejectionReasons.push('Não é foto de documento físico (screenshot detectado)');
    }
    if (!frontData.authenticity?.isAuthentic || frontData.authenticity?.hasSuspiciousEdits) {
      rejectionReasons.push('Sinais de adulteração ou edição no documento');
    }
    if (frontData.fraud?.isFraudulent) {
      rejectionReasons.push(`Documento possivelmente fraudulento: ${frontData.fraud.reasons?.join(', ')}`);
    }
    if (!backData.validation?.isReadable || !backData.validation?.isClear) {
      rejectionReasons.push('Documento ilegível ou com má qualidade no verso');
    }
    if (!backData.authenticity?.isAuthentic) {
      rejectionReasons.push('Verso do documento não parece autêntico');
    }
    if (!backData.consistency?.matchesFront) {
      rejectionReasons.push('Verso não corresponde à frente do documento');
    }
    if (!faceData.faceMatch?.isSamePerson || faceData.faceMatch?.confidence < 70) {
      rejectionReasons.push('Selfie não corresponde à foto do documento');
    }
    if (!faceData.selfieQuality?.isLivePhoto || faceData.selfieQuality?.hasSpoofing) {
      rejectionReasons.push('Selfie não parece ser uma foto ao vivo');
    }
    if (!cpfMatches) {
      rejectionReasons.push(`CPF do documento (${normalizedExtractedCPF}) não corresponde ao CPF cadastrado (${normalizedRegisteredCPF})`);
    }
    if (!nameMatches) {
      rejectionReasons.push(`Nome do documento (${extractedName}) não corresponde ao nome cadastrado (${registeredName})`);
    }

    // Se passou em todas as validações
    if (rejectionReasons.length === 0) {
      verificationStatus = 'approved';
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const result = {
      status: verificationStatus,
      extractedData: {
        fullName: extractedName,
        cpf: normalizedExtractedCPF,
        birthDate: extractedBirthDate,
        documentType: frontData.documentType,
        documentNumber: frontData.extractedData?.documentNumber
      },
      validation: {
        cpfMatches,
        nameMatches,
        nameWasPartial: !nameMatches && normalizedExtractedName.includes(normalizedRegisteredName)
      },
      analysis: {
        front: frontData,
        back: backData,
        face: faceData
      },
      rejectionReasons: rejectionReasons.length > 0 ? rejectionReasons : null
    };

    // Se aprovado e nome era parcial, atualizar perfil com nome completo e data de nascimento
    if (verificationStatus === 'approved') {
      const shouldUpdateName = result.validation.nameWasPartial;
      
      const updates: any = {
        document_verified: true,
        document_verification_status: 'approved'
      };

      if (shouldUpdateName) {
        updates.full_name = extractedName;
      }

      if (extractedBirthDate) {
        // Converter DD/MM/AAAA para AAAA-MM-DD
        const [day, month, year] = extractedBirthDate.split('/');
        updates.birth_date = `${year}-${month}-${day}`;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId);

      if (updateError) {
        console.error('Error updating profile:', updateError);
      }
    } else {
      // Marcar como rejeitado
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          document_verified: false,
          document_verification_status: 'rejected'
        })
        .eq('id', profileId);

      if (updateError) {
        console.error('Error updating profile status:', updateError);
      }
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in verify-identity-document:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
