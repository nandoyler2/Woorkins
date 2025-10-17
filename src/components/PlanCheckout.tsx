import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlanStripeCheckout } from "./PlanStripeCheckout";
import MercadoPagoCheckout from "./MercadoPagoCheckout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface PlanCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
  planPrice: number;
  onSuccess: () => void;
  clientSecret?: string;
}

export function PlanCheckout({
  open,
  onOpenChange,
  planId,
  planName,
  planPrice,
  onSuccess,
  clientSecret,
}: PlanCheckoutProps) {
  const [loading, setLoading] = useState(true);
  const [activeGateway, setActiveGateway] = useState<string | null>(null);

  useEffect(() => {
    loadGatewayConfig();
  }, []);

  const loadGatewayConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_gateway_config")
        .select("active_gateway")
        .single();

      if (error) {
        console.error("Erro ao carregar configuração:", error);
        setActiveGateway("stripe");
      } else {
        setActiveGateway(data?.active_gateway || "stripe");
      }
    } catch (error) {
      console.error("Erro:", error);
      setActiveGateway("stripe");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-4xl">
          <DialogHeader>
            <DialogTitle>Carregando checkout</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Se for Stripe, usar o componente existente
  if (activeGateway === "stripe" && clientSecret) {
    return (
      <PlanStripeCheckout
        open={open}
        onOpenChange={onOpenChange}
        clientSecret={clientSecret}
        planId={planId}
        planName={planName}
        planPrice={planPrice}
        onSuccess={onSuccess}
      />
    );
  }

  // Se for Mercado Pago
  if (activeGateway === "mercadopago") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>Assinar Plano {planName}</span>
              <span className="text-base font-semibold">
                R$ {planPrice.toFixed(2)}/mês
              </span>
            </DialogTitle>
          </DialogHeader>

          <MercadoPagoCheckout
            amount={planPrice}
            description={`Assinatura do plano ${planName}`}
            onSuccess={onSuccess}
            onCancel={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
