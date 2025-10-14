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
  active_gateway: "stripe" | "efi";
  efi_enabled: boolean;
  efi_pix_key: string;
  efi_pix_key_type: string;
  efi_pix_certificate_path: string;
  efi_pix_discount_percent: number;
  efi_pix_expiration_hours: number;
  efi_validate_mtls: boolean;
  efi_card_discount_percent: number;
}

export default function PaymentGateway() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PaymentGatewayConfig>({
    active_gateway: "stripe",
    efi_enabled: false,
    efi_pix_key: "",
    efi_pix_key_type: "cpf",
    efi_pix_certificate_path: "",
    efi_pix_discount_percent: 0,
    efi_pix_expiration_hours: 24,
    efi_validate_mtls: false,
    efi_card_discount_percent: 0,
  });
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

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
          active_gateway: data.active_gateway as "stripe" | "efi",
          efi_enabled: data.efi_enabled || false,
          efi_pix_key: data.efi_pix_key || "",
          efi_pix_key_type: data.efi_pix_key_type || "cpf",
          efi_pix_certificate_path: data.efi_pix_certificate_path || "",
          efi_pix_discount_percent: data.efi_pix_discount_percent || 0,
          efi_pix_expiration_hours: data.efi_pix_expiration_hours || 24,
          efi_validate_mtls: data.efi_validate_mtls || false,
          efi_card_discount_percent: data.efi_card_discount_percent || 0,
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

  const handleCertificateUpload = async () => {
    if (!certificateFile) return null;

    try {
      const fileName = `efi-certificate-${Date.now()}.p12`;
      const { data, error } = await supabase.storage
        .from("business-media")
        .upload(fileName, certificateFile);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("business-media")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload do certificado:", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload do certificado",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let certificatePath = config.efi_pix_certificate_path;

      if (certificateFile) {
        const uploadedPath = await handleCertificateUpload();
        if (uploadedPath) {
          certificatePath = uploadedPath;
        }
      }

      const { error } = await supabase
        .from("payment_gateway_config")
        .update({
          ...config,
          efi_pix_certificate_path: certificatePath,
        })
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

  const handleActiveGatewayChange = (gateway: "stripe" | "efi") => {
    setConfig({
      ...config,
      active_gateway: gateway,
      efi_enabled: gateway === "efi",
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
            onValueChange={(value) => handleActiveGatewayChange(value as "stripe" | "efi")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="efi">Efí Pay</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {config.active_gateway === "efi" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Credenciais Efí Pay</CardTitle>
              <CardDescription>
                Configure as credenciais da API Efí Pay (Client ID e Client Secret devem ser configurados como secrets)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.efi_enabled}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, efi_enabled: checked })
                    }
                  />
                  <span className="text-sm">
                    {config.efi_enabled ? "Ativado" : "Desativado"}
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
                <Label htmlFor="pix-key">Chave PIX</Label>
                <Input
                  id="pix-key"
                  value={config.efi_pix_key}
                  onChange={(e) =>
                    setConfig({ ...config, efi_pix_key: e.target.value })
                  }
                  placeholder="Digite sua chave PIX cadastrada no Efí"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pix-key-type">Tipo de Chave PIX</Label>
                <Select
                  value={config.efi_pix_key_type}
                  onValueChange={(value) =>
                    setConfig({ ...config, efi_pix_key_type: value })
                  }
                >
                  <SelectTrigger id="pix-key-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="random">Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="certificate">Certificado PIX (.p12)</Label>
                <Input
                  id="certificate"
                  type="file"
                  accept=".p12"
                  onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                />
                {config.efi_pix_certificate_path && (
                  <p className="text-sm text-muted-foreground">
                    Certificado atual configurado
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pix-discount">Desconto PIX (%)</Label>
                <Input
                  id="pix-discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={config.efi_pix_discount_percent}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      efi_pix_discount_percent: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pix-expiration">Tempo de Vencimento (horas)</Label>
                <Input
                  id="pix-expiration"
                  type="number"
                  min="1"
                  max="720"
                  value={config.efi_pix_expiration_hours}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      efi_pix_expiration_hours: parseInt(e.target.value) || 24,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Validar mTLS</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.efi_validate_mtls}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, efi_validate_mtls: checked })
                    }
                  />
                  <span className="text-sm">
                    {config.efi_validate_mtls ? "Ativado" : "Desativado"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Requerido pelo Banco Central para webhooks PIX
                </p>
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
                  value={config.efi_card_discount_percent}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      efi_card_discount_percent: parseFloat(e.target.value) || 0,
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
