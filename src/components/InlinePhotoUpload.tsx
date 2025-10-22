import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2 } from 'lucide-react';
import { InlineCropEditor } from './InlineCropEditor';
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
      setImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);
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
      const filePath = `${fileName}`;

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
        'moderate-profile-photo',
        {
          body: { imageUrl: publicUrl, userId }
        }
      );

      setModerating(false);

      if (moderationError) throw moderationError;

      if (!moderationData.isAppropriate) {
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
        const oldPath = currentPhotoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from(bucketName).remove([oldPath]);
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

  return (
    <>
      <div 
        className={`relative ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
        
        {/* Editor de Crop - aparece por cima quando uma imagem é selecionada */}
        {imageToCrop && (
          <div className="absolute inset-0 z-50">
            <InlineCropEditor
              imageUrl={imageToCrop}
              onSave={handleCropComplete}
              onCancel={() => {
                setImageToCrop(null);
                setOriginalFile(null);
              }}
              aspectRatio={type === 'avatar' ? 1 : 16 / 9}
              className="w-full h-full"
            />
          </div>
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
      </div>

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
