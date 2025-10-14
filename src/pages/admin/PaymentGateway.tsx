import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface PaymentGatewayConfig {
  active_gateway: "stripe" | "mercadopago";
  mercadopago_enabled: boolean;
  mercadopago_pix_discount_percent: number;
  mercadopago_card_discount_percent: number;
}

export default function PaymentGateway() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PaymentGatewayConfig>({
    active_gateway: "stripe",
    mercadopago_enabled: false,
    mercadopago_pix_discount_percent: 0,
    mercadopago_card_discount_percent: 0,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_gateway_config")
        .select("*")
        .single();

      if (error) throw error;
      if (data) {
        setConfig({
          active_gateway: data.active_gateway as "stripe" | "mercadopago",
          mercadopago_enabled: data.mercadopago_enabled || false,
          mercadopago_pix_discount_percent: data.mercadopago_pix_discount_percent || 0,
          mercadopago_card_discount_percent: data.mercadopago_card_discount_percent || 0,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("payment_gateway_config")
        .update(config)
        .eq("id", (await supabase.from("payment_gateway_config").select("id").single()).data?.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso",
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleActiveGatewayChange = (gateway: "stripe" | "mercadopago") => {
    setConfig({
      ...config,
      active_gateway: gateway,
      mercadopago_enabled: gateway === "mercadopago",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gateway de Pagamento</h1>
        <p className="text-muted-foreground">
          Configure os gateways de pagamento da plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gateway Ativo</CardTitle>
          <CardDescription>
            Selecione qual gateway de pagamento estará ativo. Apenas um pode estar ativo por vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={config.active_gateway}
            onValueChange={(value) => handleActiveGatewayChange(value as "stripe" | "mercadopago")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="mercadopago">Mercado Pago</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {config.active_gateway === "mercadopago" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Credenciais Mercado Pago</CardTitle>
              <CardDescription>
                Configure o Access Token da API Mercado Pago (deve ser configurado como secret: MERCADOPAGO_ACCESS_TOKEN)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.mercadopago_enabled}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, mercadopago_enabled: checked })
                    }
                  />
                  <span className="text-sm">
                    {config.mercadopago_enabled ? "Ativado" : "Desativado"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações PIX</CardTitle>
              <CardDescription>
                Configure as opções de pagamento via PIX
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pix-discount">Desconto PIX (%)</Label>
                <Input
                  id="pix-discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={config.mercadopago_pix_discount_percent}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mercadopago_pix_discount_percent: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações Cartão de Crédito</CardTitle>
              <CardDescription>
                Configure as opções de pagamento via Cartão de Crédito
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-discount">Desconto Cartão (%)</Label>
                <Input
                  id="card-discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={config.mercadopago_card_discount_percent}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mercadopago_card_discount_percent: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
