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
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <AlertCircle className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Vamos deixar a Woorkins mais segura...
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Para {actionText[action]}, você precisa verificar sua identidade enviando uma foto do seu documento (RG ou CNH).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-xl space-y-4 border border-primary/20">
            <h4 className="font-semibold text-base flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Por que isso é necessário?
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="rounded-full bg-primary/20 p-1 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <span className="text-sm">Garantir a segurança de todos os usuários</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="rounded-full bg-primary/20 p-1 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <span className="text-sm">Prevenir fraudes e perfis falsos</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="rounded-full bg-primary/20 p-1 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <span className="text-sm">Criar um ambiente de confiança na plataforma</span>
              </li>
            </ul>
          </div>

          <p className="text-sm text-center text-muted-foreground px-4">
            O processo é rápido e seguro. Você precisará enviar fotos do seu documento de identidade (RG ou CNH).
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="flex-1"
          >
            Agora Não
          </Button>
          <Button 
            onClick={() => setShowVerification(true)} 
            className="flex-1"
          >
            <FileCheck className="mr-2 h-4 w-4" />
            Verificar Agora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
