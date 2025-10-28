import { useState, useEffect } from 'react';

/**
 * Hook que detecta se uma imagem é clara ou escura analisando sua luminância
 * @param imageUrl - URL da imagem a ser analisada
 * @returns isDark - true se a imagem é escura, false se é clara
 */
export function useImageLuminance(imageUrl: string | null) {
  const [isDark, setIsDark] = useState(true); // Default: assumir escura (texto branco)

  useEffect(() => {
    if (!imageUrl) {
      setIsDark(true);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Criar canvas offscreen
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) return;

        // Redimensionar para análise (mais rápido)
        const sampleWidth = 100;
        const sampleHeight = 50; // Analisar apenas a parte superior
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;

        // Desenhar a imagem redimensionada
        ctx.drawImage(img, 0, 0, img.width, img.height * 0.3, 0, 0, sampleWidth, sampleHeight);

        // Extrair dados dos pixels
        const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
        const data = imageData.data;

        // Calcular luminância média usando fórmula WCAG
        let totalLuminance = 0;
        const pixelCount = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Fórmula de luminância relativa (WCAG)
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLuminance += luminance;
        }

        const averageLuminance = totalLuminance / pixelCount;

        // Se luminância média < 128, é escuro (texto branco)
        // Se >= 128, é claro (texto preto)
        setIsDark(averageLuminance < 128);
      } catch (error) {
        console.error('Erro ao analisar luminância da imagem:', error);
        // Em caso de erro, assumir escuro (texto branco)
        setIsDark(true);
      }
    };

    img.onerror = () => {
      // Em caso de erro, assumir escuro (texto branco)
      setIsDark(true);
    };

    img.src = imageUrl;
  }, [imageUrl]);

  return isDark;
}
