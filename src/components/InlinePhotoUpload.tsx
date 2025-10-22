import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2 } from 'lucide-react';
import { PhotoCropDialog } from './PhotoCropDialog';
import { compressImage } from '@/lib/imageCompression';

interface InlinePhotoUploadProps {
  currentPhotoUrl?: string;
  userId: string;
  userName: string;
  onPhotoUpdated?: () => void;
  type: 'avatar' | 'cover';
  children: React.ReactNode;
  className?: string;
  iconPosition?: 'top' | 'bottom';
}

export function InlinePhotoUpload({ 
  currentPhotoUrl, 
  userId, 
  userName, 
  onPhotoUpdated,
  type,
  children,
  className = '',
  iconPosition = 'bottom'
}: InlinePhotoUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverPosition, setCoverPosition] = useState(50); // Posição vertical em %
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(50);
  const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem (JPG, PNG, etc.)',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'A foto deve ter no máximo 5MB',
      });
      return;
    }

    setOriginalFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (type === 'cover') {
        setCoverPreview(reader.result as string);
        setCoverPosition(50);
      } else {
        setImageToCrop(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCoverSave = async () => {
    if (!originalFile || !coverPreview) return;
    
    setUploading(true);
    setCoverPreview(null);

    try {
      // Comprimir a imagem original da capa
      const compressedBlob = await compressImage(originalFile);
      const compressedFile = new File([compressedBlob], originalFile.name, { type: 'image/jpeg' });
      const fileName = `${userId}-${Date.now()}.jpg`;
      const bucketName = 'user-covers';
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, compressedFile, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      setModerating(true);

      const { data: moderationData, error: moderationError } = await supabase.functions.invoke(
        'moderate-cover-photo',
        {
          body: { imageUrl: publicUrl, userId }
        }
      );

      setModerating(false);

      if (moderationError) throw moderationError;

      if (!moderationData.approved) {
        await supabase.storage.from(bucketName).remove([filePath]);
        
        toast({
          variant: 'destructive',
          title: 'Foto rejeitada',
          description: moderationData.reason || 'A foto não atende aos padrões da comunidade',
        });
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cover_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setLocalCoverUrl(publicUrl);

      if (currentPhotoUrl) {
        try {
          const url = new URL(currentPhotoUrl);
          const needle = `/object/public/${bucketName}/`;
          const idx = url.pathname.indexOf(needle);
          const oldPath = idx !== -1 ? url.pathname.slice(idx + needle.length) : null;
          if (oldPath) {
            await supabase.storage.from(bucketName).remove([oldPath]);
          }
        } catch (e) {
          console.warn('Could not parse old photo URL for deletion', e);
        }
      }

      toast({
        title: 'Foto atualizada!',
        description: 'Sua foto de capa foi atualizada com sucesso.',
      });

      onPhotoUpdated?.();
    } catch (error) {
      console.error('Error uploading cover:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar foto',
        description: 'Não foi possível atualizar a foto de capa. Tente novamente.',
      });
    } finally {
      setUploading(false);
      setOriginalFile(null);
    }
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    setUploading(true);
    setImageToCrop(null);

    try {
      // Converter Blob para File
      const file = new File([croppedImageBlob], `${userId}-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Comprimir a imagem
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
      const fileName = `${userId}-${Date.now()}.jpg`;
      const bucketName = type === 'avatar' ? 'avatars' : 'user-covers';
      // Use a path that includes the user's id as the first folder to satisfy RLS policies
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, compressedFile, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      setModerating(true);

      // Use different moderation function based on type
      const moderationFunction = type === 'avatar' ? 'moderate-profile-photo' : 'moderate-cover-photo';
      const { data: moderationData, error: moderationError } = await supabase.functions.invoke(
        moderationFunction,
        {
          body: { imageUrl: publicUrl, userId }
        }
      );

      setModerating(false);

      if (moderationError) throw moderationError;

      if (!moderationData.approved) {
        await supabase.storage.from(bucketName).remove([filePath]);
        
        toast({
          variant: 'destructive',
          title: 'Foto rejeitada',
          description: moderationData.reason || 'A foto não atende aos padrões da comunidade',
        });
        return;
      }

      const column = type === 'avatar' ? 'avatar_url' : 'cover_url';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [column]: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      if (currentPhotoUrl) {
        try {
          const url = new URL(currentPhotoUrl);
          const needle = `/object/public/${bucketName}/`;
          const idx = url.pathname.indexOf(needle);
          const oldPath = idx !== -1 ? url.pathname.slice(idx + needle.length) : null;
          if (oldPath) {
            await supabase.storage.from(bucketName).remove([oldPath]);
          }
        } catch (e) {
          console.warn('Could not parse old photo URL for deletion', e);
        }
      }

      toast({
        title: 'Foto atualizada!',
        description: 'Sua foto foi atualizada com sucesso.',
      });

      onPhotoUpdated?.();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar foto',
        description: 'Não foi possível atualizar a foto. Tente novamente.',
      });
    } finally {
      setUploading(false);
      setOriginalFile(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (type !== 'cover' || !coverPreview) return;
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartPosition(coverPosition);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaY = e.clientY - dragStartY;
    const containerHeight = e.currentTarget.clientHeight;
    const deltaPercent = (deltaY / containerHeight) * 100;
    const newPosition = Math.max(0, Math.min(100, dragStartPosition - deltaPercent));
    setCoverPosition(newPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <>
      <div 
        className={`relative ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Preview da capa com ajuste de posição */}
        {coverPreview && type === 'cover' ? (
          <div 
            className="absolute inset-0 z-50 bg-background rounded-[inherit] overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <div 
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{
                backgroundImage: `url(${coverPreview})`,
                backgroundSize: 'cover',
                backgroundPosition: `center ${coverPosition}%`,
              }}
            />
            <div className="absolute top-3 right-3 flex gap-2 pointer-events-auto">
              <button
                onClick={() => {
                  setCoverPreview(null);
                  setOriginalFile(null);
                }}
                className="px-3 py-1.5 bg-background/90 hover:bg-background rounded-lg transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleCoverSave}
                className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors text-sm"
              >
                Salvar
              </button>
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/90 px-3 py-1.5 rounded-lg text-sm pointer-events-none">
              Arraste para ajustar
            </div>
          </div>
        ) : (
          <>
            {children}
            {localCoverUrl && type === 'cover' && !coverPreview && (
              <div
                className="absolute inset-0 rounded-[inherit] pointer-events-none z-[5]"
                style={{
                  backgroundImage: `url(${localCoverUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: `center ${coverPosition}%`,
                }}
              />
            )}
            
            {/* Ícone de câmera no canto - só aparece no hover e quando não está editando */}
            {!uploading && !moderating && isHovered && !imageToCrop && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`absolute ${iconPosition === 'top' ? 'top-3 right-3' : 'bottom-2 right-2'} bg-background/90 hover:bg-background p-2.5 rounded-full shadow-lg transition-all hover:scale-110 border-2 border-border z-10`}
              >
                <Camera className="w-4 h-4 text-foreground" />
              </button>
            )}

            {/* Loading overlay */}
            {(uploading || moderating) && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-[inherit] z-40">
                <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                <p className="text-sm text-white">
                  {moderating ? 'Verificando foto...' : 'Enviando...'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog de Crop - apenas para avatar */}
      {imageToCrop && type === 'avatar' && (
        <PhotoCropDialog
          imageUrl={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setImageToCrop(null);
            setOriginalFile(null);
          }}
          aspectRatio={1}
          cropShape="round"
          title="Ajustar Foto de Perfil"
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  );
}
