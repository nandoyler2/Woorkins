import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import woorkoinsIcon from '@/assets/woorkoins-icon-final.png';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

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
  const [elementReady, setElementReady] = useState(false);
  
  console.log('CheckoutForm state:', { stripe: !!stripe, elements: !!elements, loading, elementReady });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Ensure the Payment Element is mounted and valid before confirming
      const getPaymentElement = async () => {
        let el = elements.getElement(PaymentElement);
        if (el) return el;
        // wait up to 2s for mount
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 200));
          el = elements.getElement(PaymentElement);
          if (el) return el;
        }
        return null;
      };

      const paymentElement = await getPaymentElement();
      if (!paymentElement) {
        toast({
          title: 'Carregando formulário de pagamento',
          description: 'Aguarde 1-2 segundos e tente novamente.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast({
          title: 'Dados de pagamento incompletos',
          description: submitError.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

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
          <img src={woorkoinsIcon} alt="Woorkoins" className="h-12 w-auto object-contain" />
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

      <div className="min-h-[140px]">
        <PaymentElement 
          onReady={() => {
            console.log('PaymentElement ready');
            setElementReady(true);
          }} 
          options={{ layout: 'tabs' }} 
        />
      </div>

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
          disabled={!stripe || !elements || !elementReady || loading}
          className="flex-1 bg-gradient-primary hover:shadow-glow"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : !elementReady ? (
            'Carregando...'
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
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#0f172a',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
      rules: {
        '.Input': {
          border: '1px solid #e5e7eb',
          boxShadow: 'none',
        },
        '.Input:focus': {
          border: '1px solid #2563eb',
          boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.2)',
        },
        '.Label': {
          color: '#0f172a',
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
          <p>Stripe não está configurado corretamente. Configure VITE_STRIPE_PUBLISHABLE_KEY.</p>
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
            <img src={woorkoinsIcon} alt="Woorkoins" className="h-6 w-auto object-contain" />
            Comprar Woorkoins
          </DialogTitle>
        </DialogHeader>
        <Elements key={clientSecret} stripe={stripePromise} options={options}>
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