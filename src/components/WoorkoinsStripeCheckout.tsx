import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import woorkoinsIcon from '@/assets/woorkoins-icon-final.png';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface CheckoutFormProps {
  amount: number;
  price: number;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ amount, price, onSuccess, onCancel }: CheckoutFormProps) {
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
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/woorkoins?payment=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Erro no pagamento",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Pagamento confirmado!",
          description: `${amount} Woorkoins foram adicionados à sua conta.`,
        });
        onSuccess();
      } else if (paymentIntent && paymentIntent.status === 'processing') {
        toast({
          title: "Pagamento em processamento",
          description: "Aguarde a confirmação do pagamento.",
        });
        setTimeout(onSuccess, 2000);
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-muted p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-center gap-3">
          <img src={woorkoinsIcon} alt="Woorkoins" className="h-12 w-auto object-contain" />
          <div>
            <p className="text-2xl font-bold">{amount} Woorkoins</p>
            <p className="text-sm text-muted-foreground">Total: R$ {price.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <PaymentElement />
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
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

interface WoorkoinsStripeCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientSecret: string;
  amount: number;
  price: number;
  onSuccess: () => void;
}

export function WoorkoinsStripeCheckout({
  open,
  onOpenChange,
  clientSecret,
  amount,
  price,
  onSuccess,
}: WoorkoinsStripeCheckoutProps) {
  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#0F172A',
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={woorkoinsIcon} alt="Woorkoins" className="h-6 w-auto object-contain" />
            Comprar Woorkoins
          </DialogTitle>
        </DialogHeader>

        {clientSecret && (
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm
              amount={amount}
              price={price}
              onSuccess={onSuccess}
              onCancel={() => onOpenChange(false)}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
