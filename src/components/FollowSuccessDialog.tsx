import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SafeImage } from '@/components/ui/safe-image';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, CheckCircle, Building2, X } from 'lucide-react';

interface FollowSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileName: string;
  profileAvatar?: string | null;
  profileType: 'user' | 'business';
}

export function FollowSuccessDialog({
  open,
  onOpenChange,
  profileName,
  profileAvatar,
  profileType,
}: FollowSuccessDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-2">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 rounded-full"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center justify-center gap-6 py-6">
          {/* Ícone de sucesso animado */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div className="relative bg-primary rounded-full p-3">
              <CheckCircle className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>

          {/* Avatar do perfil */}
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
              {profileAvatar ? (
                <SafeImage
                  src={profileAvatar}
                  alt={profileName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <AvatarFallback>
                  {profileType === 'business' ? (
                    <Building2 className="w-12 h-12" />
                  ) : (
                    <User className="w-12 h-12" />
                  )}
                </AvatarFallback>
              )}
            </Avatar>
          </div>

          {/* Mensagem */}
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold">Agora você segue</h3>
            <p className="text-xl text-primary font-semibold">{profileName}</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Você poderá acompanhar as novidades no painel e receberá notificações
            </p>
          </div>

          <Button onClick={handleClose} className="mt-2">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
