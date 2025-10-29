/**
 * Utilitário para compressão e redimensionamento de imagens
 * Reduz tamanho mantendo qualidade aceitável
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  maxSizeMB: 2,
};

// Configurações otimizadas para stories
const STORY_OPTIONS: CompressionOptions = {
  maxWidth: 1080,
  maxHeight: 1920,
  quality: 0.80,
  maxSizeMB: 1.5,
};

// Configurações para miniaturas
const THUMBNAIL_OPTIONS: CompressionOptions = {
  maxWidth: 200,
  maxHeight: 200,
  quality: 0.7,
  maxSizeMB: 0.1,
};

/**
 * Comprime e redimensiona uma imagem
 * @param file Arquivo de imagem original
 * @param options Opções de compressão
 * @returns Blob comprimido da imagem
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calcular novas dimensões mantendo aspect ratio
        let { width, height } = img;
        
        if (width > opts.maxWidth! || height > opts.maxHeight!) {
          const ratio = Math.min(opts.maxWidth! / width, opts.maxHeight! / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        // Criar canvas para redimensionar
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Desenhar imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Converter para blob
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            // Se ainda está muito grande, reduzir qualidade
            if (blob.size > opts.maxSizeMB! * 1024 * 1024) {
              const reducedQuality = Math.max(0.5, opts.quality! - 0.2);
              canvas.toBlob(
                (reducedBlob) => {
                  if (!reducedBlob) {
                    reject(new Error('Failed to create reduced blob'));
                    return;
                  }
                  resolve(reducedBlob);
                },
                file.type,
                reducedQuality
              );
            } else {
              resolve(blob);
            }
          },
          file.type,
          opts.quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime arquivo de imagem e retorna novo File
 */
export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const blob = await compressImage(file, options);
  return new File([blob], file.name, { type: file.type });
}

/**
 * Comprime múltiplas imagens em paralelo
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<Blob[]> {
  return Promise.all(files.map(file => compressImage(file, options)));
}

/**
 * Comprime imagem especificamente para stories
 * Dimensões otimizadas: 1080x1920 (vertical)
 */
export async function compressImageForStory(file: File): Promise<Blob> {
  return compressImage(file, STORY_OPTIONS);
}

/**
 * Cria miniatura otimizada para carrossel de stories
 * Dimensões pequenas: 200x200
 */
export async function createThumbnail(file: File): Promise<Blob> {
  return compressImage(file, THUMBNAIL_OPTIONS);
}
