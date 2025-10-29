import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { PhotoCropDialog } from './PhotoCropDialog';
import { 
  compressAvatar, 
  compressAvatarThumbnail, 
  compressCover, 
  compressCoverThumbnail,
  compressLogo,
  compressLogoThumbnail 
} from '@/lib/imageCompression';
import { CoverTemplateDialog } from './CoverTemplateDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InlinePhotoUploadProps {
  currentPhotoUrl?: string;
  userId: string;
  userName: string;
  onPhotoUpdated?: () => void;
  type: 'avatar' | 'cover';
  children: React.ReactNode;
  className?: string;
  iconPosition?: 'top' | 'bottom';
  currentCoverPosition?: number;
  entityType?: 'user' | 'business';
  profileId: string;
}

export function InlinePhotoUpload({ 
  currentPhotoUrl, 
  userId, 
  userName, 
  onPhotoUpdated,
  type,
  children,
  className = '',
  iconPosition = 'bottom',
  currentCoverPosition = 50,
  entityType = 'user',
  profileId
}: InlinePhotoUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverPosition, setCoverPosition] = useState(currentCoverPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(50);
  const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

    try {
      // Comprimir a imagem original da capa - versão completa
      const compressedBlob = await compressCover(originalFile);
      const compressedFile = new File([compressedBlob], originalFile.name, { type: 'image/jpeg' });
      
      // Comprimir thumbnail
      const thumbnailBlob = await compressCoverThumbnail(originalFile);
      
      const timestamp = Date.now();
      const fileName = `${userId}-${timestamp}.jpg`;
      const thumbnailFileName = `${userId}-${timestamp}_thumb.jpg`;
      const bucketName = entityType === 'business' ? 'business-covers' : 'user-covers';
      const filePath = `${userId}/${fileName}`;
      const thumbnailPath = `${userId}/${thumbnailFileName}`;

      // Upload versão completa
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, compressedFile, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Upload thumbnail
      const { error: thumbUploadError } = await supabase.storage
        .from(bucketName)
        .upload(thumbnailPath, thumbnailBlob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (thumbUploadError) throw thumbUploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      const { data: { publicUrl: thumbnailUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(thumbnailPath);

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
        await supabase.storage.from(bucketName).remove([filePath, thumbnailPath]);
        
        toast({
          variant: 'destructive',
          title: 'Foto rejeitada',
          description: moderationData.reason || 'A foto não atende aos padrões da comunidade',
        });
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          cover_url: publicUrl,
          cover_thumbnail_url: thumbnailUrl,
          cover_position: Math.round(coverPosition)
        })
        .eq('id', profileId);

      if (updateError) throw updateError;

      setLocalCoverUrl(publicUrl);

      // Deletar foto antiga do storage
      if (currentPhotoUrl) {
        try {
          const url = new URL(currentPhotoUrl);
          const needle = `/object/public/${bucketName}/`;
          const idx = url.pathname.indexOf(needle);
          const oldPath = idx !== -1 ? url.pathname.slice(idx + needle.length) : null;
          if (oldPath) {
            const oldThumbPath = oldPath.replace(/(\.[^.]+)$/, '_thumb$1');
            await supabase.storage.from(bucketName).remove([oldPath, oldThumbPath]);
          }
        } catch (e) {
          console.warn('Could not parse old photo URL for deletion', e);
        }
      }

      setCoverPreview(null);
      
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
      
      // Determine bucket based on entity type and photo type
      const bucketName = entityType === 'business' 
        ? (type === 'avatar' ? 'business-logos' : 'business-covers')
        : (type === 'avatar' ? 'avatars' : 'user-covers');

      const isAvatar = type === 'avatar';
      const isBusinessLogo = entityType === 'business' && isAvatar;

      // Comprimir a imagem - versão completa
      const compressedBlob = isAvatar
        ? (isBusinessLogo ? await compressLogo(file) : await compressAvatar(file))
        : await compressCover(file);
      
      // Comprimir thumbnail
      const thumbnailBlob = isAvatar
        ? (isBusinessLogo ? await compressLogoThumbnail(file) : await compressAvatarThumbnail(file))
        : await compressCoverThumbnail(file);

      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
      const timestamp = Date.now();
      const fileName = `${userId}-${timestamp}.jpg`;
      const thumbnailFileName = `${userId}-${timestamp}_thumb.jpg`;
      
      // Use a path that includes the user's id as the first folder to satisfy RLS policies
      const filePath = `${userId}/${fileName}`;
      const thumbnailPath = `${userId}/${thumbnailFileName}`;

      // Upload versão completa
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, compressedFile, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Upload thumbnail
      const { error: thumbUploadError } = await supabase.storage
        .from(bucketName)
        .upload(thumbnailPath, thumbnailBlob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (thumbUploadError) throw thumbUploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      const { data: { publicUrl: thumbnailUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(thumbnailPath);

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
        await supabase.storage.from(bucketName).remove([filePath, thumbnailPath]);
        
        toast({
          variant: 'destructive',
          title: 'Foto rejeitada',
          description: moderationData.reason || 'A foto não atende aos padrões da comunidade',
        });
        return;
      }

      // Determine columns based on entity type and photo type
      const column = entityType === 'business'
        ? (type === 'avatar' ? 'logo_url' : 'cover_url')
        : (type === 'avatar' ? 'avatar_url' : 'cover_url');
      
      const thumbnailColumn = entityType === 'business'
        ? (type === 'avatar' ? 'logo_thumbnail_url' : 'cover_thumbnail_url')
        : (type === 'avatar' ? 'avatar_thumbnail_url' : 'cover_thumbnail_url');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          [column]: publicUrl,
          [thumbnailColumn]: thumbnailUrl
        })
        .eq('id', profileId);

      if (updateError) throw updateError;

      if (currentPhotoUrl) {
        try {
          const url = new URL(currentPhotoUrl);
          const needle = `/object/public/${bucketName}/`;
          const idx = url.pathname.indexOf(needle);
          const oldPath = idx !== -1 ? url.pathname.slice(idx + needle.length) : null;
          if (oldPath) {
            const oldThumbPath = oldPath.replace(/(\.[^.]+)$/, '_thumb$1');
            await supabase.storage.from(bucketName).remove([oldPath, oldThumbPath]);
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

  const handleAdjustCover = () => {
    const coverUrl = localCoverUrl || currentPhotoUrl;
    if (coverUrl && type === 'cover') {
      setCoverPreview(coverUrl);
      setCoverPosition(currentCoverPosition);
      setIsAdjusting(true);
    }
  };

  const handleTemplateSelect = async (templateUrl: string) => {
    setShowTemplateDialog(false);
    setUploading(true);

    try {
      // Carregar a imagem do template
      const response = await fetch(templateUrl);
      const blob = await response.blob();
      const file = new File([blob], `template-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Comprimir versão completa
      const compressedBlob = await compressCover(file);
      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
      
      // Comprimir thumbnail
      const thumbnailBlob = await compressCoverThumbnail(file);
      
      const timestamp = Date.now();
      const fileName = `${userId}-${timestamp}.jpg`;
      const thumbnailFileName = `${userId}-${timestamp}_thumb.jpg`;
      const bucketName = entityType === 'business' ? 'business-covers' : 'user-covers';
      const filePath = `${userId}/${fileName}`;
      const thumbnailPath = `${userId}/${thumbnailFileName}`;

      // Upload versão completa
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, compressedFile, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Upload thumbnail
      const { error: thumbUploadError } = await supabase.storage
        .from(bucketName)
        .upload(thumbnailPath, thumbnailBlob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (thumbUploadError) throw thumbUploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      const { data: { publicUrl: thumbnailUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(thumbnailPath);

      // Capas de template são pré-aprovadas, não precisam de moderação

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          cover_url: publicUrl,
          cover_thumbnail_url: thumbnailUrl,
          cover_position: 50
        })
        .eq('id', profileId);

      if (updateError) throw updateError;

      setLocalCoverUrl(publicUrl);
      setCoverPosition(50);

      // Deletar foto antiga
      if (currentPhotoUrl) {
        try {
          const url = new URL(currentPhotoUrl);
          const needle = `/object/public/${bucketName}/`;
          const idx = url.pathname.indexOf(needle);
          const oldPath = idx !== -1 ? url.pathname.slice(idx + needle.length) : null;
          if (oldPath) {
            const oldThumbPath = oldPath.replace(/(\.[^.]+)$/, '_thumb$1');
            await supabase.storage.from(bucketName).remove([oldPath, oldThumbPath]);
          }
        } catch (e) {
          console.warn('Could not parse old photo URL for deletion', e);
        }
      }

      toast({
        title: 'Capa atualizada!',
        description: 'Sua capa foi atualizada com sucesso.',
      });

      onPhotoUpdated?.();
    } catch (error) {
      console.error('Error applying template:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível aplicar a capa.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAdjustment = async () => {
    if (!isAdjusting || !coverPreview) return;
    
    setUploading(true);
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cover_position: Math.round(coverPosition) })
        .eq('id', profileId);

      if (updateError) throw updateError;

      setIsAdjusting(false);
      setCoverPreview(null);

      toast({
        title: 'Posição atualizada!',
        description: 'A posição da capa foi ajustada com sucesso.',
      });
      
      onPhotoUpdated?.();
    } catch (error) {
      console.error('Error updating cover position:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar a posição da capa.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCover = async () => {
    if (!currentPhotoUrl && !localCoverUrl) return;
    
    setShowDeleteDialog(false);
    setUploading(true);
    
    try {
      const bucketName = entityType === 'business' ? 'business-covers' : 'user-covers';
      const coverUrl = localCoverUrl || currentPhotoUrl;
      
      // Deletar arquivo do storage
      if (coverUrl) {
        try {
          const url = new URL(coverUrl);
          const needle = `/object/public/${bucketName}/`;
          const idx = url.pathname.indexOf(needle);
          const path = idx !== -1 ? url.pathname.slice(idx + needle.length) : null;
          if (path) {
            await supabase.storage.from(bucketName).remove([path]);
          }
        } catch (e) {
          console.warn('Could not parse cover URL for deletion', e);
        }
      }

      // Remover do banco de dados
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          cover_url: null,
          cover_position: 50
        })
        .eq('id', profileId);

      if (updateError) throw updateError;

      setLocalCoverUrl(null);
      setCoverPosition(50);

      toast({
        title: 'Capa removida',
        description: 'A capa foi removida com sucesso.',
      });
      
      onPhotoUpdated?.();
    } catch (error) {
      console.error('Error deleting cover:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao deletar',
        description: 'Não foi possível remover a capa.',
      });
    } finally {
      setUploading(false);
    }
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
            onMouseDown={!uploading ? handleMouseDown : undefined}
            onMouseMove={!uploading ? handleMouseMove : undefined}
            onMouseUp={!uploading ? handleMouseUp : undefined}
            onMouseLeave={!uploading ? handleMouseUp : undefined}
            style={{ cursor: uploading ? 'default' : (isDragging ? 'grabbing' : 'grab') }}
          >
            <div 
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{
                backgroundImage: `url(${coverPreview})`,
                backgroundSize: 'cover',
                backgroundPosition: `center ${coverPosition}%`,
              }}
            />
            
            {/* Loading overlay durante o salvamento */}
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center pointer-events-none z-10">
                <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                <p className="text-sm text-white">Salvando...</p>
              </div>
            )}
            
            <div className="absolute top-3 right-3 flex gap-2 pointer-events-auto">
              <button
                onClick={() => {
                  setCoverPreview(null);
                  setOriginalFile(null);
                  setIsAdjusting(false);
                }}
                disabled={uploading}
                className="px-3 py-1.5 bg-background/90 hover:bg-background rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={isAdjusting ? handleSaveAdjustment : handleCoverSave}
                disabled={uploading}
                className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
            
            {/* Overlay central para capa padrão */}
            {type === 'cover' && !localCoverUrl && !currentPhotoUrl && !coverPreview && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-10 group cursor-pointer">
                <div className="text-center">
                  <p className="text-white text-lg md:text-xl font-semibold mb-4">Altere a capa</p>
                  <div className="flex gap-3 justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white/90 hover:bg-white px-4 py-2 rounded-lg shadow-lg transition-all hover:scale-105 text-sm font-medium"
                    >
                      Enviar Nova
                    </button>
                    <button
                      onClick={() => setShowTemplateDialog(true)}
                      className="bg-white/90 hover:bg-white px-4 py-2 rounded-lg shadow-lg transition-all hover:scale-105 text-sm font-medium flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Usar Prontas</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Ícone de câmera - posição diferente para avatar e cover */}
            {!uploading && !moderating && isHovered && !imageToCrop && (
              <>
                {type === 'cover' ? (
                  (localCoverUrl || currentPhotoUrl) && (
                    <div className="absolute top-3 right-3 flex gap-2 z-10">
                      <button
                        onClick={() => setShowTemplateDialog(true)}
                        className="bg-background/90 hover:bg-background px-3 py-1.5 rounded-lg shadow-lg transition-all hover:scale-105 border-2 border-border text-sm flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Capas Prontas</span>
                      </button>
                      <button
                        onClick={handleAdjustCover}
                        className="bg-background/90 hover:bg-background px-3 py-1.5 rounded-lg shadow-lg transition-all hover:scale-105 border-2 border-border text-sm"
                      >
                        Ajustar
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-background/90 hover:bg-background p-2.5 rounded-full shadow-lg transition-all hover:scale-110 border-2 border-border"
                      >
                        <Camera className="w-4 h-4 text-foreground" />
                      </button>
                      <button
                        onClick={() => setShowDeleteDialog(true)}
                        className="bg-destructive/90 hover:bg-destructive p-2.5 rounded-full shadow-lg transition-all hover:scale-110 border-2 border-border"
                        title="Remover capa"
                      >
                        <Trash2 className="w-4 h-4 text-destructive-foreground" />
                      </button>
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-primary hover:bg-primary/90 text-primary-foreground p-3 rounded-full shadow-lg transition-all hover:scale-110 z-10"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                )}
              </>
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

      <CoverTemplateDialog
        open={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        onSelect={handleTemplateSelect}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover capa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a capa? A capa padrão será exibida no lugar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCover} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
