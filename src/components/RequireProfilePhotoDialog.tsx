import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Loader2, AlertTriangle } from 'lucide-react';
import { ProfilePhotoCropDialog } from './ProfilePhotoCropDialog';

interface RequireProfilePhotoDialogProps {
  open: boolean;
  userName: string;
  userId: string;
  onPhotoUploaded: () => void;
}

export function RequireProfilePhotoDialog({ 
  open, 
  userName, 
  userId, 
  onPhotoUploaded 
}: RequireProfilePhotoDialogProps) {
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

      // Convert cropped blob to base64 for moderation
      const reader = new FileReader();
      reader.readAsDataURL(croppedBlob);

      
      await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });

      const base64Image = reader.result as string;

      // Call moderation function
      const { data: moderationResult, error: moderationError } = await supabase.functions.invoke(
        'moderate-profile-photo',
        { body: { imageUrl: base64Image } }
      );

      setModerating(false);

      if (moderationError) {
        throw new Error('Erro ao validar foto. Tente novamente.');
      }

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
      const fileName = `${userId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      toast({
        title: '✅ Foto Aprovada!',
        description: 'Agora você pode enviar mensagens.',
      });

      onPhotoUploaded();
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
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Foto de Perfil Obrigatória
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Para garantir a segurança de todos, você precisa adicionar uma <strong>foto REAL</strong> mostrando seu rosto antes de enviar mensagens.
              </AlertDescription>
            </Alert>

            <div className="text-sm space-y-2 text-foreground">
              <p className="font-semibold">✅ Sua foto deve:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Ser uma <strong>foto REAL</strong> mostrando seu rosto claramente</li>
                <li>Ter boa iluminação</li>
                <li>Ser apropriada e profissional</li>
              </ul>

              <p className="font-semibold mt-4">🚫 Não pode ser:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Desenho, avatar ou ilustração</li>
                <li>Logo, objeto ou animal</li>
                <li>Foto muito escura ou silhueta</li>
                <li>Conteúdo impróprio</li>
              </ul>
            </div>

            {moderating && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Validando sua foto... Aguarde.
                </AlertDescription>
              </Alert>
            )}

            {uploading && (
              <Alert>
                <AlertDescription>
                  Enviando foto aprovada...
                </AlertDescription>
              </Alert>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            onClick={() => document.getElementById('require-photo-upload')?.click()}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {moderating ? 'Validando...' : 'Enviando...'}
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Adicionar Foto de Perfil
              </>
            )}
          </Button>
          <input
            id="require-photo-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isProcessing}
            className="hidden"
          />
        </AlertDialogFooter>

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
      </AlertDialogContent>
    </AlertDialog>
  );
}
