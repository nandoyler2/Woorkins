import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const stripePromise = loadStripe('pk_live_51O1f4uJe3Q1gl7R9Lwo7G85I4rwMoj0zjzjTKLnv7Mr42JIOLvm3TktR9DW470KVq2Za0gaHkbeQIrwqGP2z58zg00ekNM7Ov4');

interface CheckoutFormProps {
  clientSecret: string;
  amount: number;
  platformFee: number;
  stripeFee: number;
  netAmount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ clientSecret, amount, platformFee, stripeFee, netAmount, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/my-projects?payment=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: 'Erro no pagamento',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Pagamento realizado!',
          description: 'O valor foi retido em segurança até a conclusão do serviço.',
        });
        onSuccess();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar o pagamento.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Valor do Serviço:</span>
          <span className="font-semibold">R$ {amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Taxa da Plataforma:</span>
          <span>- R$ {platformFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Taxa de Processamento:</span>
          <span>- R$ {stripeFee.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between">
          <span className="font-medium">Freelancer Recebe:</span>
          <span className="font-semibold text-green-600">R$ {netAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>🔒 Pagamento Seguro com Escrow</strong>
        </p>
        <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
          Seu pagamento ficará retido em segurança até você confirmar a conclusão do serviço.
          Somente após sua confirmação o valor será liberado ao freelancer.
        </p>
      </div>

      <PaymentElement />

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            'Confirmar Pagamento'
          )}
        </Button>
      </div>
    </form>
  );
}

interface StripeCheckoutProps {
  clientSecret: string;
  amount: number;
  platformFee: number;
  stripeFee: number;
  netAmount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StripeCheckout(props: StripeCheckoutProps) {
  const options = {
    clientSecret: props.clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">Pagamento do Serviço</h3>
      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm {...props} />
      </Elements>
    </Card>
  );
}