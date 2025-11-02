import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/lib/imageCompression';

interface UploadTask {
  id: string;
  type: 'story';
  status: 'uploading' | 'success' | 'error';
  progress: number;
  message: string;
}

interface UploadContextType {
  currentUpload: UploadTask | null;
  uploadStory: (data: StoryUploadData) => Promise<void>;
  onStoryUploaded?: () => void;
  setOnStoryUploaded: (callback: (() => void) | undefined) => void;
}

interface StoryUploadData {
  profileId: string;
  type: 'image' | 'video' | 'text';
  mediaFile?: File;
  textContent?: string;
  backgroundColor?: string;
  linkUrl?: string;
  metadata?: any;
  stickers?: Array<{
    type: string;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    rotation: number;
    content: any;
    scale?: number;
  }>;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [currentUpload, setCurrentUpload] = useState<UploadTask | null>(null);
  const [onStoryUploaded, setOnStoryUploaded] = useState<(() => void) | undefined>(undefined);
  const { toast } = useToast();

  // Aviso antes de sair se houver upload em andamento
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentUpload?.status === 'uploading') {
        e.preventDefault();
        e.returnValue = 'Há um upload em andamento. Se você sair agora, o upload será cancelado.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentUpload]);

  // Auto-ocultar após sucesso ou erro
  useEffect(() => {
    if (currentUpload?.status === 'success' || currentUpload?.status === 'error') {
      const timer = setTimeout(() => {
        setCurrentUpload(null);
      }, currentUpload.status === 'success' ? 5000 : 8000);
      return () => clearTimeout(timer);
    }
  }, [currentUpload?.status]);

  const uploadStory = useCallback(async (data: StoryUploadData) => {
    const uploadId = `upload-${Date.now()}`;
    
    try {
      setCurrentUpload({
        id: uploadId,
        type: 'story',
        status: 'uploading',
        progress: 0,
        message: 'Preparando mídia...',
      });

      let mediaUrl = null;
      let thumbnailUrl = null;
      let mediaBase64ForModeration = null;

      // Upload de mídia se necessário
      if (data.type !== 'text' && data.mediaFile) {
        setCurrentUpload(prev => prev ? { ...prev, message: 'Otimizando qualidade...', progress: 20 } : null);

        // Comprimir imagem para story (1080x1920, qualidade otimizada)
        const { compressImageForStory, createThumbnail } = await import('@/lib/imageCompression');
        const compressedBlob = await compressImageForStory(data.mediaFile);
        const compressedFile = new File([compressedBlob], data.mediaFile.name, {
          type: compressedBlob.type,
        });

        setCurrentUpload(prev => prev ? { ...prev, message: 'Gerando miniatura...', progress: 40 } : null);

        // Criar thumbnail otimizada (200x200)
        const thumbnailBlob = await createThumbnail(data.mediaFile);
        const thumbnailFile = new File([thumbnailBlob], data.mediaFile.name, {
          type: thumbnailBlob.type,
        });

        // Converter para base64 para moderação
        const reader = new FileReader();
        mediaBase64ForModeration = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(compressedFile);
        });

        setCurrentUpload(prev => prev ? { ...prev, message: 'Verificando conteúdo...', progress: 50 } : null);
        
        // Moderar conteúdo antes do upload
        const { data: moderationData, error: moderationError } = await supabase.functions.invoke('moderate-story', {
          body: {
            mediaBase64: mediaBase64ForModeration,
            textContent: data.textContent || '',
            type: data.type
          }
        });

        if (moderationError) {
          console.error('Moderation error:', moderationError);
          throw new Error('Não foi possível verificar o conteúdo. Tente novamente.');
        }

        if (!moderationData?.approved) {
          const reason = moderationData?.reason || 'Conteúdo não permitido';
          console.log('Content rejected:', reason);
          throw new Error(reason);
        }

        setCurrentUpload(prev => prev ? { ...prev, message: 'Enviando arquivo...', progress: 60 } : null);

        const fileExt = data.mediaFile.name.split('.').pop();
        const timestamp = Date.now();
        const fileName = `${data.profileId}/${timestamp}.${fileExt}`;
        const thumbName = `${data.profileId}/${timestamp}-thumb.${fileExt}`;

        // Upload da imagem principal
        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(fileName, compressedFile);

        if (uploadError) throw uploadError;

        // Upload da thumbnail
        const { error: thumbError } = await supabase.storage
          .from('stories')
          .upload(thumbName, thumbnailFile);

        if (thumbError) throw thumbError;

        // Obter URLs públicas
        const { data: { publicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(fileName);

        const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(thumbName);

        mediaUrl = publicUrl;
        thumbnailUrl = thumbPublicUrl;
      } else if (data.type === 'text') {
        // Moderar conteúdo de texto
        setCurrentUpload(prev => prev ? { ...prev, message: 'Verificando conteúdo...', progress: 50 } : null);
        
        const { data: moderationData, error: moderationError } = await supabase.functions.invoke('moderate-story', {
          body: {
            mediaBase64: null,
            textContent: data.textContent || '',
            type: 'text'
          }
        });

        if (moderationError) {
          console.error('Moderation error:', moderationError);
          throw new Error('Não foi possível verificar o conteúdo. Tente novamente.');
        }

        if (!moderationData?.approved) {
          const reason = moderationData?.reason || 'Conteúdo não permitido';
          console.log('Content rejected:', reason);
          throw new Error(reason);
        }
      }

      setCurrentUpload(prev => prev ? { ...prev, message: 'Publicando story...', progress: 80 } : null);

      // Criar story no banco
      const storyData: any = {
        profile_id: data.profileId,
        type: data.type,
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        text_content: data.type === 'text' ? data.textContent : null,
        background_color: data.type === 'text' ? data.backgroundColor : null,
        link_url: data.linkUrl || null,
      };

      if (data.metadata) {
        storyData.metadata = data.metadata;
      }

      const { data: insertData, error: insertError } = await supabase
        .from('profile_stories')
        .insert(storyData)
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Adicionar story ao sessionStorage para aparecer primeiro para o criador
      if (insertData?.id) {
        const recentStories = sessionStorage.getItem('recentlyCreatedStories');
        const currentStories = recentStories ? JSON.parse(recentStories) : [];
        currentStories.push(insertData.id);
        sessionStorage.setItem('recentlyCreatedStories', JSON.stringify(currentStories));
      }

      // Salvar stickers se houver
      if (data.stickers && data.stickers.length > 0 && insertData?.id) {
        const stickersToInsert = data.stickers.map(sticker => ({
          story_id: insertData.id,
          type: sticker.type,
          position_x: sticker.position_x,
          position_y: sticker.position_y,
          width: sticker.width,
          height: sticker.height,
          rotation: sticker.rotation,
          content: sticker.content,
          scale: sticker.scale || 1
        }));

        const { error: stickersError } = await supabase
          .from('story_stickers')
          .insert(stickersToInsert);

        if (stickersError) {
          console.error('Error inserting stickers:', stickersError);
          // Não falha o upload se os stickers falharem
        }
      }

      setCurrentUpload({
        id: uploadId,
        type: 'story',
        status: 'success',
        progress: 100,
        message: 'Story publicado com sucesso! ✨',
      });

      // Notificar que o story foi publicado
      if (onStoryUploaded) {
        onStoryUploaded();
      }

    } catch (error) {
      console.error('Error uploading story:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao publicar story. Tente novamente.';
      
      // Verificar se é erro de moderação
      const isModerationError = errorMessage.includes('não foi possível verificar') || 
                                 errorMessage.includes('não permitido') ||
                                 errorMessage.includes('rejeitado') ||
                                 errorMessage.includes('Conteúdo');
      
      // Se for erro de moderação, apenas lançar para o dialog capturar
      if (isModerationError) {
        // Limpar o estado de upload para não mostrar UploadIndicator
        setCurrentUpload(null);
        throw error;
      }
      
      // Para outros erros, mostrar no UploadIndicator
      setCurrentUpload({
        id: uploadId,
        type: 'story',
        status: 'error',
        progress: 0,
        message: errorMessage,
      });
      
      throw error;
    }
  }, [toast, onStoryUploaded]);

  return (
    <UploadContext.Provider value={{ currentUpload, uploadStory, onStoryUploaded, setOnStoryUploaded }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within UploadProvider');
  }
  return context;
}
