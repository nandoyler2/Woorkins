import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error("VITE_STRIPE_PUBLISHABLE_KEY não está configurada");
}

const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

interface PlanStripeCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientSecret: string;
  planId: string;
  planName: string;
  planPrice: number;
  onSuccess: () => void;
}

function CheckoutForm({
  onSuccess,
  onCancel,
  planName,
  planPrice,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  planName: string;
  planPrice: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Erro no pagamento",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        toast({
          title: "Pagamento confirmado!",
          description: `Você agora está no plano ${planName}!`,
        });
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Plano:</span>
          <span className="font-semibold">{planName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Valor mensal:</span>
          <span className="text-xl font-bold">R$ {planPrice.toFixed(2)}</span>
        </div>
      </div>

      <PaymentElement />

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
        <Button type="submit" disabled={!stripe || loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            "Confirmar Pagamento"
          )}
        </Button>
      </div>
    </form>
  );
}

export function PlanStripeCheckout({
  open,
  onOpenChange,
  clientSecret,
  planId,
  planName,
  planPrice,
  onSuccess,
}: PlanStripeCheckoutProps) {
  if (!stripePromise) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erro de configuração</DialogTitle>
            <DialogDescription>
              A chave pública do Stripe não está configurada. Entre em contato
              com o suporte.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: "stripe" as const,
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Finalizar Assinatura</DialogTitle>
          <DialogDescription>
            Complete o pagamento para ativar seu plano {planName}
          </DialogDescription>
        </DialogHeader>

        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm
            onSuccess={onSuccess}
            onCancel={() => onOpenChange(false)}
            planName={planName}
            planPrice={planPrice}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  );
}
