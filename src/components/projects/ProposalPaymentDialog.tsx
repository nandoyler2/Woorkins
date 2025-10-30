import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2, CreditCard } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

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
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('create-project-payment', {
        body: { proposal_id: proposalId },
      });

      if (error) throw error;

      // Redirecionar para a URL do checkout
      if (data?.url) {
        window.open(data.url, '_blank');
        onOpenChange(false);
      } else {
        throw new Error('URL de checkout não foi retornada');
      }
    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar Proposta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Projeto:</span>
              <span className="font-medium">{projectTitle}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold text-lg">
              <span>Valor a Pagar:</span>
              <span className="text-primary">
                R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
            <p className="font-medium">🔒 Pagamento 100% Seguro</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>O valor ficará retido em segurança na plataforma</li>
              <li>O freelancer só receberá após você confirmar a conclusão</li>
              <li>Você precisa validar que todo o trabalho foi finalizado</li>
              <li>Seu dinheiro fica protegido até a entrega completa</li>
            </ul>
          </div>

          <Button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pagar R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}