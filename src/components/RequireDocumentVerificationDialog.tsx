import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileCheck } from 'lucide-react';
import { useState } from 'react';
import { IdentityVerificationDialog } from './IdentityVerificationDialog';

interface RequireDocumentVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  registeredName: string;
  registeredCPF: string;
  action: 'create_project' | 'send_message';
}

export function RequireDocumentVerificationDialog({
  open,
  onOpenChange,
  profileId,
  registeredName,
  registeredCPF,
  action
}: RequireDocumentVerificationDialogProps) {
  const [showVerification, setShowVerification] = useState(false);

  const actionText = {
    create_project: 'criar projetos',
    send_message: 'enviar mensagens'
  };

  if (showVerification) {
    return (
      <IdentityVerificationDialog
        open={showVerification}
        onOpenChange={(open) => {
          setShowVerification(open);
          if (!open) {
            onOpenChange(false);
          }
        }}
        profileId={profileId}
        registeredName={registeredName}
        registeredCPF={registeredCPF}
        onVerificationComplete={() => {
          setShowVerification(false);
          onOpenChange(false);
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Verificação de Identidade Necessária
          </DialogTitle>
          <DialogDescription className="pt-4 space-y-3">
            <p>
              Para {actionText[action]}, você precisa verificar sua identidade enviando uma foto do seu documento (RG ou CNH).
            </p>
            <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Por que isso é necessário?</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Garantir a segurança de todos os usuários</li>
                <li>Prevenir fraudes e perfis falsos</li>
                <li>Criar um ambiente de confiança na plataforma</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              O processo é rápido e seguro. Você precisará tirar fotos ao vivo do seu documento e do seu rosto.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Agora Não
          </Button>
          <Button onClick={() => setShowVerification(true)} className="flex-1">
            <FileCheck className="mr-2 h-4 w-4" />
            Verificar Agora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
