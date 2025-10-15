import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SupportChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportChatDialog({ open, onOpenChange }: SupportChatDialogProps) {
  const whatsappSupportNumber = '5511999999999'; // Substitua pelo número real
  const whatsappMessage = encodeURIComponent('Olá! Preciso de ajuda com a verificação de identidade.');

  const handleWhatsAppClick = () => {
    window.open(`https://wa.me/${whatsappSupportNumber}?text=${whatsappMessage}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Falar com o Suporte</DialogTitle>
          <DialogDescription>
            Nossa equipe está pronta para ajudar você com a verificação de identidade
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-8 w-8 text-primary" />
              <div>
                <h4 className="font-semibold">Suporte via WhatsApp</h4>
                <p className="text-sm text-muted-foreground">
                  Fale diretamente com nossa equipe
                </p>
              </div>
            </div>

            <Button 
              onClick={handleWhatsAppClick}
              className="w-full"
              size="lg"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Abrir WhatsApp
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Horário de atendimento:</strong></p>
            <p>Segunda a Sexta: 9h às 18h</p>
            <p>Sábado: 9h às 13h</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Dica:</strong> Tenha em mãos seus documentos e descreva o problema que está enfrentando.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
