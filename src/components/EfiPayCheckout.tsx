import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode } from "lucide-react";

interface EfiPayCheckoutProps {
  amount: number;
  description: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EfiPayCheckout({ amount, description, onSuccess, onCancel }: EfiPayCheckoutProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [pixData, setPixData] = useState<any>(null);

  // Dados do cliente
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerDocument, setCustomerDocument] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Dados do cartão
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [installments, setInstallments] = useState(1);

  const handlePixPayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("efi-create-pix-charge", {
        body: {
          amount,
          description,
          customer: {
            name: customerName,
            email: customerEmail,
            document: customerDocument,
          },
        },
      });

      if (error) throw error;

      setPixData(data);
      toast({
        title: "QR Code PIX gerado",
        description: "Escaneie o QR Code para efetuar o pagamento",
      });
    } catch (error) {
      console.error("Erro ao gerar PIX:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o QR Code PIX",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = async () => {
    setLoading(true);
    try {
      // Aqui você precisaria tokenizar o cartão antes de enviar
      // Para isso, use a SDK do Efí no frontend
      const { data, error } = await supabase.functions.invoke("efi-create-card-charge", {
        body: {
          amount,
          description,
          customer: {
            name: customerName,
            email: customerEmail,
            document: customerDocument,
            phone: customerPhone,
          },
          card: {
            payment_token: "TOKEN_AQUI", // Token gerado pela SDK Efí
          },
          installments,
        },
      });

      if (error) throw error;

      toast({
        title: "Pagamento processado",
        description: "Seu pagamento foi processado com sucesso",
      });
      onSuccess();
    } catch (error) {
      console.error("Erro ao processar cartão:", error);
      toast({
        title: "Erro",
        description: "Não foi possível processar o pagamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Pagamento via Efí Pay</CardTitle>
        <CardDescription>
          Valor: R$ {amount.toFixed(2)} - {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "pix" | "card")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pix">PIX</TabsTrigger>
            <TabsTrigger value="card">Cartão de Crédito</TabsTrigger>
          </TabsList>

          <TabsContent value="pix" className="space-y-4">
            {!pixData ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="seu@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document">CPF</Label>
                  <Input
                    id="document"
                    value={customerDocument}
                    onChange={(e) => setCustomerDocument(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>

                <Button onClick={handlePixPayment} disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <QrCode className="mr-2 h-4 w-4" />
                  Gerar QR Code PIX
                </Button>
              </>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR Code abaixo com o app do seu banco
                </p>
                {pixData.qrcode_image && (
                  <img
                    src={`data:image/png;base64,${pixData.qrcode_image}`}
                    alt="QR Code PIX"
                    className="mx-auto"
                  />
                )}
                <div className="space-y-2">
                  <Label>Código PIX Copia e Cola</Label>
                  <Input value={pixData.qrcode} readOnly />
                </div>
                <p className="text-sm text-muted-foreground">
                  Expira em: {new Date(pixData.expires_at).toLocaleString()}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="card" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="card-name">Nome Completo</Label>
                <Input
                  id="card-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-email">E-mail</Label>
                <Input
                  id="card-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-document">CPF</Label>
                <Input
                  id="card-document"
                  value={customerDocument}
                  onChange={(e) => setCustomerDocument(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="card-number">Número do Cartão</Label>
                <Input
                  id="card-number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="0000 0000 0000 0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-holder">Nome no Cartão</Label>
                <Input
                  id="card-holder"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Nome impresso no cartão"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="installments">Parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  min="1"
                  max="12"
                  value={installments}
                  onChange={(e) => setInstallments(parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-expiry">Validade</Label>
                <Input
                  id="card-expiry"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  placeholder="MM/AA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-cvv">CVV</Label>
                <Input
                  id="card-cvv"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  placeholder="000"
                  maxLength={4}
                />
              </div>
            </div>

            <Button onClick={handleCardPayment} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pagar com Cartão
            </Button>
          </TabsContent>
        </Tabs>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
