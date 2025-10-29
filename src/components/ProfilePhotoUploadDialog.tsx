import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import { CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';

interface ProfilePhotoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPhotoUrl: string;
  userName: string;
  profileId: string;
  onPhotoUpdated: () => void;
}

export function ProfilePhotoUploadDialog({
  open,
  onOpenChange,
  currentPhotoUrl,
  userName,
  profileId,
  onPhotoUpdated
}: ProfilePhotoUploadDialogProps) {
  const [photoUpdated, setPhotoUpdated] = useState(false);

  const handlePhotoUpdate = () => {
    setPhotoUpdated(true);
    onPhotoUpdated();
    
    // Fechar após 2 segundos mostrando sucesso
    setTimeout(() => {
      setPhotoUpdated(false);
      onOpenChange(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!photoUpdated ? (
          <>
            <DialogHeader>
              <DialogTitle>Atualizar Foto de Perfil</DialogTitle>
              <DialogDescription>
                Escolha uma nova foto para seu perfil. Você poderá ajustar o enquadramento após o upload.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center gap-6 py-4">
              <ProfilePhotoUpload
                currentPhotoUrl={currentPhotoUrl}
                userName={userName}
                profileId={profileId}
                onPhotoUpdated={handlePhotoUpdate}
              />
            </div>
          </>
        ) : (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-green-900">
                Foto Atualizada!
              </h3>
              <p className="text-sm text-muted-foreground">
                Sua foto de perfil foi atualizada com sucesso.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
