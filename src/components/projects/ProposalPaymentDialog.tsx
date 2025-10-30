import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, ArrowLeft } from 'lucide-react';
import MercadoPagoCheckout from '@/components/MercadoPagoCheckout';

// Ícone oficial do PIX
const PixIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 512 512" className={className} fill="currentColor">
    <path d="M242.4 292.5C247.8 287.1 257.1 287.1 262.5 292.5L339.5 369.5C353.7 383.7 372.6 391.5 392.6 391.5H407.7L310.6 488.6C280.3 518.1 231.1 518.1 200.8 488.6L103.3 391.5H112.6C132.6 391.5 151.5 383.7 165.7 369.5L242.4 292.5zM262.5 218.9C257.1 224.3 247.8 224.3 242.4 218.9L165.7 142.1C151.5 127.9 132.6 120.1 112.6 120.1H103.3L200.7 22.76C231.1-7.586 280.3-7.586 310.6 22.76L407.8 120.1H392.6C372.6 120.1 353.7 127.9 339.5 142.1L262.5 218.9zM112.6 142.1C126.4 142.1 139.1 148.3 149.7 158.1L226.4 236.8C233.6 243.1 243 246.7 252.5 246.7C261.9 246.7 271.3 243.1 278.5 236.8L355.5 158.1C365.3 148.3 378.8 142.1 392.6 142.1H407.7L488.6 222.9C518.9 253.2 518.9 302.4 488.6 332.7L407.8 413.5H392.6C378.8 413.5 365.3 407.3 355.5 397.5L278.5 320.8C264.6 306.1 240.3 306.1 226.4 320.8L149.7 397.5C139.1 407.3 126.4 413.5 112.6 413.5H103.3L22.76 332.7C-7.586 302.4-7.586 253.2 22.76 222.9L103.3 142.1H112.6z"/>
  </svg>
);

type PaymentStep = 'summary' | 'checkout';

interface ProposalPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  amount: number;
  projectTitle: string;
}

export function ProposalPaymentDialog({
  open,
  onOpenChange,
  proposalId,
  amount,
  projectTitle,
}: ProposalPaymentDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<PaymentStep>('summary');
  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'card' | null>(null);

  // Reset step when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('summary');
      setSelectedMethod(null);
    }
  }, [open]);

  const handleSuccess = () => {
    toast({
      title: 'Pagamento confirmado!',
      description: 'O freelancer foi notificado e pode começar o trabalho',
    });
    onOpenChange(false);
  };

  const handleMethodSelect = (method: 'pix' | 'card') => {
    setSelectedMethod(method);
    setStep('checkout');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {step === 'checkout' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setStep('summary')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <span>Pagar Proposta</span>
            <span className="text-sm font-normal text-muted-foreground">
              {projectTitle}
            </span>
          </DialogTitle>
        </DialogHeader>

        {step === 'summary' && (
          <div className="space-y-3">
            <div className="rounded-lg border p-4 bg-card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Projeto:</p>
                  <p className="text-sm font-medium">{projectTitle}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm font-semibold">Valor a Pagar:</span>
                <span className="text-2xl font-bold text-primary">
                  R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="bg-muted p-3 rounded-lg text-xs space-y-1.5">
              <p className="font-medium flex items-center gap-1.5 text-sm">
                <span>🔒</span>
                Pagamento 100% Seguro
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground ml-1">
                <li>O valor ficará retido em segurança na plataforma</li>
                <li>O freelancer só receberá após você confirmar a conclusão</li>
                <li>Você precisa validar que todo o trabalho foi finalizado</li>
                <li>Seu dinheiro fica protegido até a entrega completa</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleMethodSelect('pix')}
                className="h-11 bg-[#32BCAD] hover:bg-[#2BA89A] text-white text-sm"
              >
                <PixIcon className="h-4 w-4 mr-1.5" />
                Pagar com PIX
              </Button>

              <Button
                onClick={() => handleMethodSelect('card')}
                className="h-11 text-sm"
              >
                <CreditCard className="h-4 w-4 mr-1.5" />
                Pagar com Cartão
              </Button>
            </div>
          </div>
        )}

        {step === 'checkout' && selectedMethod && (
          <div className="space-y-4">
            <MercadoPagoCheckout
              amount={amount}
              description={`Pagamento de proposta - ${projectTitle}`}
              onSuccess={handleSuccess}
              onCancel={() => setStep('summary')}
              proposalId={proposalId}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}