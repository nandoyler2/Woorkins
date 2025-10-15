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
      registeredCPF,
      currentProfilePhotoUrl
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Análise inteligente do documento (frente)
    console.log('Analyzing front document with lenient approach...');
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
                text: `ANÁLISE SUPER LENIENTE DE DOCUMENTO BRASILEIRO - FRENTE

REGRA DE OURO: SEJA EXTREMAMENTE LENIENTE E PRÁTICO!

IMPORTANTE:
- SE você consegue LER as informações, marque como "clear" 
- SÓ marque "illegible" se for REALMENTE impossível ver
- Brilho, sombra, documento antigo - TUDO OK se dá pra ler
- Documentos podem ter 30+ ANOS - isso é NORMAL
- Desgaste, desbotamento leve - ACEITÁVEL

INSTRUÇÕES DE LEITURA:
1. Identifique: RG ou CNH
2. EXTRAIA OS DADOS (faça força, mesmo com brilho/sombra):
   - Nome completo
   - CPF (11 dígitos, apenas números)
   - Data de nascimento (DD/MM/AAAA)
   - Número do documento

CRITÉRIOS DE LEGIBILIDADE (seja generoso):
Para cada campo, marque como:
- "clear": consegue ler (MESMO com algum brilho/sombra)
- "partially_visible": dificulta mas consegue ver a maioria
- "illegible": IMPOSSÍVEL de ver (quase nunca use isso)

EXEMPLOS DE "clear":
- Texto com leve brilho mas números/letras visíveis
- Documento velho mas informação legível
- Sombra parcial mas dados visíveis

EXEMPLOS DE "illegible":
- Completamente apagado/cortado
- Área totalmente coberta
- Texto totalmente borrado (muito raro)

VALIDAÇÃO:
- isReadable: true se QUALQUER campo crítico estiver visível
- isPhysicalDocument: false apenas se for CLARAMENTE screenshot
- hasClearFraud: true apenas se ver edição ÓBVIA

RESPONDA EM JSON:
{
  "documentType": "RG" ou "CNH",
  "extractedData": {
    "fullName": "NOME COMPLETO EXTRAÍDO",
    "cpf": "12345678901",
    "birthDate": "28/03/1996",
    "documentNumber": "número"
  },
  "quality": "excellent" | "good" | "acceptable",
  "readability": {
    "name": "clear",
    "cpf": "clear",
    "birthDate": "clear",
    "photo": "clear"
  },
  "validation": {
    "isReadable": true,
    "reason": "",
    "isPhysicalDocument": true
  },
  "authenticity": {
    "isAuthentic": true,
    "hasClearFraud": false,
    "details": "Documento parece autêntico"
  }
}`
              },
              {
                type: 'image_url',
                image_url: { url: documentFrontBase64 }
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
                text: `ANÁLISE DO VERSO - Seja leniente, apenas verifique se é legível e parece autêntico.

RESPONDA EM JSON:
{
  "validation": {
    "isReadable": true/false,
    "reason": "motivo se false"
  },
  "authenticity": {
    "isAuthentic": true/false,
    "details": "explicação"
  }
}`
              },
              {
                type: 'image_url',
                image_url: { url: documentBackBase64 }
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

    // Comparação facial INTELIGENTE
    console.log('Comparing faces with age-aware analysis...');
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
                text: `COMPARAÇÃO FACIAL INTELIGENTE

CONTEXTO CRÍTICO:
- Foto do documento pode ter 5-20 ANOS
- CRIANÇAS crescem para ADULTOS - isso é NORMAL
- Peso, cabelo, barba, óculos - MUDAM (ignore isso)
- Foque APENAS em ESTRUTURA ÓSSEA permanente

CARACTERÍSTICAS PERMANENTES:
1. Formato do rosto (oval, redondo, quadrado)
2. Espaçamento entre os olhos
3. Estrutura do nariz
4. Estrutura óssea das bochechas/mandíbula

IGNORE:
- Idade/diferença de idade
- Cabelo, barba, maquiagem
- Peso corporal
- Qualidade das fotos

SÓ rejeite se ESTRUTURA FACIAL for CLARAMENTE diferente (pessoas totalmente diferentes).

IMAGENS:
1. Documento (pode ser MUITO antiga, até criança)
2. Selfie atual

RESPONDA EM JSON:
{
  "faceMatch": {
    "isSamePerson": true/false,
    "confidence": 0-100,
    "ageContext": "descrição da diferença de idade",
    "details": "explicação focando em características permanentes"
  },
  "selfieQuality": {
    "isLivePhoto": true/false,
    "isClear": true/false,
    "hasSpoofing": true/false
  }
}`
              },
              {
                type: 'image_url',
                image_url: { url: documentFrontBase64 }
              },
              {
                type: 'image_url',
                image_url: { url: selfieBase64 }
              }
            ]
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!faceComparison.ok) {
      throw new Error(`Face comparison failed: ${faceComparison.status}`);
    }

    const faceResult = await faceComparison.json();
    const faceData = JSON.parse(faceResult.choices[0].message.content);

    // Validação de foto de perfil (se fornecida)
    let profilePhotoValidation: any = null;
    
    if (currentProfilePhotoUrl) {
      console.log('Validating profile photo...');
      const profilePhotoComparison = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                  text: `VALIDAÇÃO DE FOTO DE PERFIL

Compare foto de perfil com selfie verificada.

VERIFICAR:
1. É a mesma pessoa? (confiança 0-100%)
2. Foto de perfil é real ou fake?
   - Celebridade/modelo?
   - Gerada por IA?
   - Muito editada?

RESPONDA EM JSON:
{
  "faceMatch": {
    "confidence": 0-100
  },
  "authenticity": {
    "isRealPhoto": true/false,
    "isCelebrityOrModel": true/false,
    "isAIGenerated": true/false
  }
}`
                },
                {
                  type: 'image_url',
                  image_url: { url: currentProfilePhotoUrl }
                },
                {
                  type: 'image_url',
                  image_url: { url: selfieBase64 }
                }
              ]
            }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });

      if (profilePhotoComparison.ok) {
        const profilePhotoResult = await profilePhotoComparison.json();
        profilePhotoValidation = JSON.parse(profilePhotoResult.choices[0].message.content);
      }
    }

    // Validação final inteligente
    const extractedName = frontData.extractedData?.fullName || '';
    const extractedCPF = frontData.extractedData?.cpf || '';
    const extractedBirthDate = frontData.extractedData?.birthDate || '';

    const normalizedExtractedCPF = extractedCPF.replace(/[.\-]/g, '');
    const normalizedRegisteredCPF = registeredCPF.replace(/[.\-]/g, '');
    const cpfMatches = normalizedExtractedCPF === normalizedRegisteredCPF;

    const normalizedExtractedName = extractedName.toLowerCase().trim();
    const normalizedRegisteredName = registeredName.toLowerCase().trim();
    const nameMatches = normalizedExtractedName.includes(normalizedRegisteredName) || 
                       normalizedRegisteredName.includes(normalizedExtractedName);

    let verificationStatus = 'rejected';
    let rejectionReasons = [];

    // Validações ULTRA LENIENTES - só rejeite se REALMENTE necessário
    // SÓ rejeite por legibilidade se campos críticos NÃO foram extraídos
    if (!extractedName || extractedName.length < 3) {
      rejectionReasons.push('Nome não foi extraído. Melhore a iluminação na área do nome.');
    }
    if (!normalizedExtractedCPF || normalizedExtractedCPF.length !== 11) {
      rejectionReasons.push('CPF não foi identificado. Tire foto mais nítida da área do CPF.');
    }
    if (!extractedBirthDate || !extractedBirthDate.match(/\d{2}\/\d{2}\/\d{4}/)) {
      rejectionReasons.push('Data de nascimento não foi identificada. Foque melhor essa área.');
    }
    
    if (frontData.validation?.isPhysicalDocument === false) {
      rejectionReasons.push('Use o documento físico original, não screenshot ou foto de tela.');
    }
    
    if (frontData.authenticity?.hasClearFraud) {
      rejectionReasons.push('Documento parece fraudulento. Use seu documento original.');
    }
    
    if (backData.validation?.isReadable === false) {
      rejectionReasons.push('Verso do documento ilegível. Tire nova foto com melhor luz.');
    }
    
    // Comparação facial - MUITO leniente com idade
    if (!faceData.faceMatch?.isSamePerson && faceData.faceMatch?.confidence < 50) {
      rejectionReasons.push('Características faciais não correspondem. Tire selfie clara, bem iluminada, olhando para câmera.');
    }
    
    if (faceData.selfieQuality?.hasSpoofing) {
      rejectionReasons.push('Selfie parece não ser ao vivo. Tire uma selfie real olhando para a câmera.');
    }
    
    if (!cpfMatches && normalizedExtractedCPF.length === 11) {
      rejectionReasons.push('CPF do documento não corresponde. Verifique se é o documento correto.');
    }
    
    if (!nameMatches && normalizedExtractedName && normalizedRegisteredName) {
      rejectionReasons.push(`Nome não corresponde. Verifique se é o documento correto.`);
    }
    
    if (profilePhotoValidation?.faceMatch?.confidence < 60) {
      rejectionReasons.push('Foto de perfil parece ser de outra pessoa. Use uma foto real sua.');
    }
    if (profilePhotoValidation?.authenticity?.isCelebrityOrModel) {
      rejectionReasons.push('Foto de perfil não é sua (parece celebridade/modelo). Use foto real.');
    }
    if (profilePhotoValidation?.authenticity?.isAIGenerated) {
      rejectionReasons.push('Foto de perfil parece ser gerada por IA. Use foto real.');
    }

    // Aprovar se não houver motivos sérios para rejeitar
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
        documentType: frontData.documentType
      },
      validation: {
        cpfMatches,
        nameMatches,
        nameWasPartial: nameMatches && normalizedExtractedName.length > normalizedRegisteredName.length
      },
      analysis: {
        front: frontData,
        back: backData,
        face: faceData,
        profilePhoto: profilePhotoValidation
      },
      rejectionReasons: rejectionReasons.length > 0 ? rejectionReasons : null,
      requiresProfilePhotoChange: profilePhotoValidation && profilePhotoValidation.faceMatch?.confidence < 60
    };

    // Se aprovado, atualizar perfil
    if (verificationStatus === 'approved') {
      const updates: any = {
        document_verified: true,
        document_verification_status: 'approved'
      };

      if (result.validation.nameWasPartial && extractedName) {
        updates.full_name = extractedName;
      }

      if (extractedBirthDate) {
        const [day, month, year] = extractedBirthDate.split('/');
        if (day && month && year) {
          updates.birth_date = `${year}-${month}-${day}`;
        }
      }

      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId);
    }

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
