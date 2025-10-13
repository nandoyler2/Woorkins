import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import woorkoinsIcon from '@/assets/woorkoins-icon.png';

const STRIPE_PUBLISHABLE_KEY = 'pk_live_51Q1f4uJe3QLgIR99LWo76B5I4rwMoj0zjTKLnv7MP421OLvmaTKtR9DM470KVqZZa9gaHkbeQInwqGP2z58zg00eKMM7Ov4';

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

interface CheckoutFormProps {
  clientSecret: string;
  amount: number;
  price: number;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ clientSecret, amount, price, onSuccess, onCancel }: CheckoutFormProps) {
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
          return_url: `${window.location.origin}/woorkoins?payment=success`,
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
          description: `Você recebeu ${amount} Woorkoins!`,
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
      <div className="bg-muted p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-center gap-3">
          <img src={woorkoinsIcon} alt="Woorkoins" className="w-12 h-12" />
          <div>
            <p className="text-2xl font-bold">{amount} Woorkoins</p>
            <p className="text-sm text-muted-foreground">Total: R$ {price.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>🔒 Pagamento Seguro</strong>
        </p>
        <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
          Seus Woorkoins serão creditados imediatamente após a confirmação do pagamento.
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
          className="flex-1 bg-gradient-primary hover:shadow-glow"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            `Pagar R$ ${price.toFixed(2)}`
          )}
        </Button>
      </div>
    </form>
  );
}

interface WoorkoinsCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientSecret: string;
  amount: number;
  price: number;
  onSuccess: () => void;
}

export function WoorkoinsCheckout({ open, onOpenChange, clientSecret, amount, price, onSuccess }: WoorkoinsCheckoutProps) {
  console.log('WoorkoinsCheckout render:', { open, hasClientSecret: !!clientSecret, amount, price });

  const options = {
    clientSecret,
    appearance: {
      theme: 'flat' as const,
      variables: {
        colorPrimary: 'hsl(var(--primary))',
        colorBackground: 'hsl(var(--background))',
        colorText: 'hsl(var(--foreground))',
        colorDanger: 'hsl(var(--destructive))',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
      rules: {
        '.Input': {
          border: '1px solid hsl(var(--border))',
          boxShadow: 'none',
        },
        '.Input:focus': {
          border: '1px solid hsl(var(--primary))',
          boxShadow: '0 0 0 2px hsl(var(--primary) / 0.2)',
        },
        '.Label': {
          color: 'hsl(var(--foreground))',
          fontWeight: '500',
        },
      },
    },
  };

  if (!stripePromise) {
    console.error('Stripe not initialized - missing publishable key');
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erro de Configuração</DialogTitle>
          </DialogHeader>
          <p>Stripe não está configurado corretamente. Por favor, contate o suporte.</p>
        </DialogContent>
      </Dialog>
    );
  }

  console.log('Rendering Stripe Elements');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={woorkoinsIcon} alt="Woorkoins" className="w-6 h-6" />
            Comprar Woorkoins
          </DialogTitle>
        </DialogHeader>
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm
            clientSecret={clientSecret}
            amount={amount}
            price={price}
            onSuccess={() => {
              onSuccess();
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  );
}