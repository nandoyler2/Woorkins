import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { WoorkoinsStripeCheckout } from "./WoorkoinsStripeCheckout";
import MercadoPagoCheckout from "./MercadoPagoCheckout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import woorkoinsIcon from "@/assets/woorkoins-icon-latest.png";

interface WoorkoinsCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  price: number;
  onSuccess: () => void;
  clientSecret?: string;
}

export function WoorkoinsCheckout({
  open,
  onOpenChange,
  amount,
  price,
  onSuccess,
  clientSecret,
}: WoorkoinsCheckoutProps) {
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
      <WoorkoinsStripeCheckout
        open={open}
        onOpenChange={onOpenChange}
        clientSecret={clientSecret}
        amount={amount}
        price={price}
        onSuccess={onSuccess}
      />
    );
  }

  // Se for Mercado Pago, usar componente com SDK completo
  if (activeGateway === "mercadopago") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <img src={woorkoinsIcon} alt="Woorkoins" className="h-6 w-auto object-contain" />
              <span>Comprar Woorkoins</span>
              <span className="text-base font-semibold">
                {amount} Woorkoins • R$ {price.toFixed(2)}
              </span>
            </DialogTitle>
          </DialogHeader>

          <MercadoPagoCheckout
            amount={price}
            description={`Compra de ${amount} Woorkoins`}
            onSuccess={onSuccess}
            onCancel={() => onOpenChange(false)}
            woorkoinsAmount={amount}
            woorkoinsPrice={price}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Stripe como fallback
  return null;
}
