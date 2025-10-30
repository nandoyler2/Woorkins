import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import MercadoPagoCheckout from '@/components/MercadoPagoCheckout';

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
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, cpf, user_id')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setProfileData({
            name: data.full_name,
            email: user.email,
            document: data.cpf,
          });
        }
      }
    };
    if (open) {
      loadProfile();
    }
  }, [open]);

  const handleSuccess = () => {
    toast({
      title: 'Pagamento confirmado!',
      description: 'O freelancer foi notificado e pode começar o trabalho',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Pagar Proposta</span>
            <span className="text-base font-normal text-muted-foreground">
              {projectTitle}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Valor Total:</span>
              <span className="text-2xl font-bold text-primary">
                R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
            <p className="font-medium flex items-center gap-2">
              <span className="text-lg">🔒</span>
              Pagamento 100% Seguro
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>O valor ficará retido em segurança na plataforma</li>
              <li>O freelancer só receberá após você confirmar que todo o trabalho foi finalizado e entregue</li>
              <li>Você precisa validar a conclusão completa do projeto antes de liberar o pagamento</li>
              <li>Seu dinheiro fica 100% protegido até a confirmação final da entrega</li>
            </ul>
          </div>

          <MercadoPagoCheckout
            amount={amount}
            description={`Pagamento de proposta - ${projectTitle}`}
            onSuccess={handleSuccess}
            onCancel={() => onOpenChange(false)}
            proposalId={proposalId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}