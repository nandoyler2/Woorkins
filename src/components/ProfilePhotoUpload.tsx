import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProfilePhotoCropDialog } from './ProfilePhotoCropDialog';
import { compressImage } from '@/lib/imageCompression';

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string;
  userName: string;
  profileId: string; // ID do perfil ao invés de userId para maior precisão
  onPhotoUpdated?: () => void;
}

export function ProfilePhotoUpload({ currentPhotoUrl, userName, profileId, onPhotoUpdated }: ProfilePhotoUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem (JPG, PNG, etc.)',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'A foto deve ter no máximo 5MB',
      });
      return;
    }

    // Store original file and show crop dialog
    setOriginalFile(file);
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!originalFile) return;
    try {
      setModerating(true);
      setImageToCrop(null);

      // Compress cropped image
      console.log('Compressing profile photo...');
      const compressedBlob = await compressImage(
        new File([croppedBlob], originalFile.name, { type: croppedBlob.type }),
        {
          maxWidth: 800,
          maxHeight: 800,
          quality: 0.85,
          maxSizeMB: 1
        }
      );

      // Convert compressed blob to base64 for moderation
      const reader = new FileReader();
      reader.readAsDataURL(compressedBlob);
      
      await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });

      const base64Image = reader.result as string;

      // Call moderation function
      console.log('Moderating profile photo...');
      const { data: moderationResult, error: moderationError } = await supabase.functions.invoke(
        'moderate-profile-photo',
        { body: { imageUrl: base64Image } }
      );

      setModerating(false);

      if (moderationError) {
        throw new Error('Erro ao validar foto. Tente novamente.');
      }

      console.log('Moderation result:', moderationResult);

      if (!moderationResult?.approved) {
        toast({
          variant: 'destructive',
          title: '🚫 Foto Rejeitada',
          description: moderationResult?.reason || 'Esta foto não atende aos requisitos. Use uma foto real sua mostrando claramente seu rosto.',
          duration: 10000,
        });
        setOriginalFile(null);
        return;
      }

      // Upload approved photo
      setUploading(true);

      const fileExt = originalFile.name.split('.').pop();
      const fileName = `${profileId}-${Date.now()}.${fileExt}`;

      // Delete old avatar if exists
      if (currentPhotoUrl) {
        const oldPath = currentPhotoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload compressed photo
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile (usando profileId para maior precisão)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profileId);

      if (updateError) throw updateError;

      toast({
        title: '✅ Foto Aprovada!',
        description: 'Sua foto de perfil foi atualizada com sucesso.',
      });

      onPhotoUpdated?.();
      setOriginalFile(null);

    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer upload',
        description: error.message || 'Não foi possível enviar a foto. Tente novamente.',
      });
    } finally {
      setUploading(false);
      setModerating(false);
    }
  };

  const isProcessing = uploading || moderating;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative group">
          <Avatar className="h-32 w-32 ring-4 ring-background shadow-xl">
            <AvatarImage src={currentPhotoUrl} />
            <AvatarFallback className="bg-primary/10 text-primary text-3xl">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Upload Button at Bottom Center */}
          <label
            htmlFor="photo-upload"
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-3 shadow-lg transition-all duration-200 cursor-pointer ${
              isProcessing ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
          </label>
          
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isProcessing}
            className="hidden"
          />
        </div>

        {moderating && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Validando sua foto... Verificando se é uma foto real mostrando seu rosto.
            </AlertDescription>
          </Alert>
        )}

        {uploading && (
          <Alert>
            <Upload className="h-4 w-4" />
            <AlertDescription>
              Enviando foto aprovada...
            </AlertDescription>
          </Alert>
        )}

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Clique na câmera para alterar sua foto
          </p>
          <Alert className="text-left">
            <AlertDescription className="text-xs space-y-1">
              <p className="font-semibold">⚠️ Requisitos da foto:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Deve ser uma <strong>foto REAL</strong> mostrando seu rosto</li>
                <li>Boa iluminação (rosto visível e claro)</li>
                <li>Não pode ser desenho, avatar ou ilustração</li>
                <li>Não pode ser logo, objeto ou animal</li>
                <li>Foto profissional ou apropriada</li>
                <li>Máximo 5MB</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Crop Dialog */}
      {imageToCrop && (
        <ProfilePhotoCropDialog
          imageUrl={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setImageToCrop(null);
            setOriginalFile(null);
            URL.revokeObjectURL(imageToCrop);
          }}
        />
      )}
    </div>
  );
}
