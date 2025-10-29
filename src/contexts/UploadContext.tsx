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

  // Auto-ocultar após sucesso
  useEffect(() => {
    if (currentUpload?.status === 'success') {
      const timer = setTimeout(() => {
        setCurrentUpload(null);
      }, 5000);
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

      const { error: insertError } = await supabase
        .from('profile_stories')
        .insert(storyData);

      if (insertError) throw insertError;

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
      setCurrentUpload({
        id: uploadId,
        type: 'story',
        status: 'error',
        progress: 0,
        message: 'Erro ao publicar story. Tente novamente.',
      });

      toast({
        title: 'Erro ao publicar',
        description: 'Não foi possível publicar o story. Tente novamente.',
        variant: 'destructive',
      });
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
