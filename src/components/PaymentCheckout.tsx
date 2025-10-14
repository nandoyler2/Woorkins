import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StripeCheckout } from "./StripeCheckout";
import MercadoPagoCheckout from "./MercadoPagoCheckout";
import { Loader2 } from "lucide-react";

interface PaymentCheckoutProps {
  amount: number;
  description: string;
  onSuccess: () => void;
  onCancel: () => void;
  clientSecret?: string;
  platformFee?: number;
  stripeFee?: number;
  netAmount?: number;
}

export default function PaymentCheckout({
  amount,
  description,
  onSuccess,
  onCancel,
  clientSecret,
  platformFee = 0,
  stripeFee = 0,
  netAmount = 0,
}: PaymentCheckoutProps) {
  const [loading, setLoading] = useState(true);
  const [activeGateway, setActiveGateway] = useState<"stripe" | "mercadopago">("stripe");

  useEffect(() => {
    loadGatewayConfig();
  }, []);

  const loadGatewayConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_gateway_config")
        .select("active_gateway")
        .single();

      if (error) throw error;
      if (data) {
        setActiveGateway(data.active_gateway as "stripe" | "mercadopago");
      }
    } catch (error) {
      console.error("Erro ao carregar configuração do gateway:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (activeGateway === "mercadopago") {
    return (
      <MercadoPagoCheckout
        amount={amount}
        description={description}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    );
  }

  // Stripe como padrão
  if (!clientSecret) {
    return (
      <div className="text-center text-muted-foreground">
        Erro ao carregar pagamento
      </div>
    );
  }

  return (
    <StripeCheckout
      clientSecret={clientSecret}
      amount={amount}
      platformFee={platformFee}
      stripeFee={stripeFee}
      netAmount={netAmount}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}
