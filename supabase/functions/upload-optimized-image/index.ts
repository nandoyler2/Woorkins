import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompressImageParams {
  imageData: string; // base64
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

// Função para comprimir imagem usando canvas (simulado no edge)
async function compressImage(params: CompressImageParams): Promise<Blob> {
  const { imageData, maxWidth, maxHeight, quality } = params;
  
  // Decodificar base64
  const base64Data = imageData.split(',')[1];
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Retornar blob (edge function limitation - compression would need external service)
  // Para produção real, usar serviço como imgproxy ou sharp
  return new Blob([bytes], { type: 'image/jpeg' });
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { imageBase64, bucket, path, imageType } = await req.json();

    if (!imageBase64 || !bucket || !path || !imageType) {
      throw new Error('Missing required parameters');
    }

    // Configurações por tipo de imagem
    const configs: Record<string, { full: any; thumbnail: any }> = {
      avatar: {
        full: { maxWidth: 800, maxHeight: 800, quality: 0.85 },
        thumbnail: { maxWidth: 150, maxHeight: 150, quality: 0.75 },
      },
      cover: {
        full: { maxWidth: 1920, maxHeight: 600, quality: 0.85 },
        thumbnail: { maxWidth: 600, maxHeight: 200, quality: 0.75 },
      },
      logo: {
        full: { maxWidth: 400, maxHeight: 400, quality: 0.85 },
        thumbnail: { maxWidth: 150, maxHeight: 150, quality: 0.75 },
      },
    };

    const config = configs[imageType];
    if (!config) {
      throw new Error('Invalid image type');
    }

    // Gerar versão completa
    const fullBlob = await compressImage({
      imageData: imageBase64,
      ...config.full,
    });

    // Gerar thumbnail
    const thumbnailBlob = await compressImage({
      imageData: imageBase64,
      ...config.thumbnail,
    });

    // Upload versão completa
    const fullPath = path;
    const { data: fullData, error: fullError } = await supabase.storage
      .from(bucket)
      .upload(fullPath, fullBlob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (fullError) throw fullError;

    // Upload thumbnail
    const thumbnailPath = path.replace(/(\.[^.]+)$/, '_thumb$1');
    const { data: thumbnailData, error: thumbnailError } = await supabase.storage
      .from(bucket)
      .upload(thumbnailPath, thumbnailBlob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (thumbnailError) throw thumbnailError;

    // Obter URLs públicas
    const { data: { publicUrl: fullUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fullPath);

    const { data: { publicUrl: thumbnailUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(thumbnailPath);

    console.log('Images uploaded successfully', { fullUrl, thumbnailUrl });

    return new Response(
      JSON.stringify({ full_url: fullUrl, thumbnail_url: thumbnailUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error uploading optimized image:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
