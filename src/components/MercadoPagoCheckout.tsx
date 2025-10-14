import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, CreditCard } from "lucide-react";

interface MercadoPagoCheckoutProps {
  amount: number;
  description: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MercadoPagoCheckout({
  amount,
  description,
  onSuccess,
  onCancel,
}: MercadoPagoCheckoutProps) {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  
  // Dados do cliente
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerDocument, setCustomerDocument] = useState("");

  const isValidEmail = (email: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
  const isValidFullName = (name: string) => name.trim().split(/\s+/).length >= 2;
  const isValidDocument = (doc: string) => {
    const d = (doc || '').replace(/\D/g, '');
    return d.length === 11 || d.length === 14;
  };

  const handlePixPayment = async () => {
    const nameTrimmed = customerName.trim().replace(/\s+/g, ' ');
    const emailTrimmed = customerEmail.trim();
    const docDigits = (customerDocument || '').replace(/\D/g, '');

    if (!isValidFullName(nameTrimmed)) {
      toast({ title: 'Nome inválido', description: 'Informe nome e sobrenome.', variant: 'destructive' });
      return;
    }
    if (!isValidEmail(emailTrimmed)) {
      toast({ title: 'E-mail inválido', description: 'Informe um e-mail válido.', variant: 'destructive' });
      return;
    }
    if (!isValidDocument(docDigits)) {
      toast({ title: 'Documento inválido', description: 'Informe um CPF/CNPJ válido.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mercadopago-create-payment", {
        body: {
          paymentMethod: "pix",
          amount: amount,
          description: description,
          customer: {
            name: nameTrimmed,
            email: emailTrimmed.toLowerCase(),
            document: docDigits,
          },
        },
      });

      if (error) throw error;

      setPixData(data);
      toast({
        title: "QR Code PIX gerado!",
        description: "Aguardando confirmação do pagamento...",
      });
    } catch (error: any) {
      console.error("Erro ao gerar PIX:", error);
      toast({
        title: "Erro ao gerar PIX",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = async () => {
    toast({
      title: "Pagamento com cartão em desenvolvimento",
      description: "Use PIX por enquanto",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagamento via Mercado Pago</CardTitle>
        <CardDescription>
          Total: R$ {amount.toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!pixData ? (
          <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "pix" | "card")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pix" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                PIX
              </TabsTrigger>
              <TabsTrigger value="card" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Cartão
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pix" className="space-y-4">
              <div className="space-y-4">
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
                  <Label htmlFor="document">CPF/CNPJ</Label>
                  <Input
                    id="document"
                    value={customerDocument}
                    onChange={(e) => setCustomerDocument(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handlePixPayment}
                    disabled={
                      loading ||
                      !isValidFullName(customerName) ||
                      !isValidEmail(customerEmail) ||
                      !isValidDocument(customerDocument)
                    }
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando QR Code...
                      </>
                    ) : (
                      <>
                        <QrCode className="mr-2 h-4 w-4" />
                        Gerar QR Code PIX
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={onCancel}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="card">
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">
                  Pagamento com cartão via Mercado Pago em breve.
                </p>
                <Button variant="outline" onClick={onCancel} className="w-full">
                  Cancelar
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <div className="bg-background border rounded-lg p-4 space-y-4">
              {pixData.qrcode_base64 && (
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${pixData.qrcode_base64}`}
                    alt="QR Code PIX"
                    className="w-64 h-64"
                  />
                </div>
              )}

              {pixData.qrcode && (
                <div className="space-y-2">
                  <Label>Código PIX Copia e Cola</Label>
                  <div className="flex gap-2">
                    <Input value={pixData.qrcode} readOnly className="font-mono text-xs" />
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(pixData.qrcode);
                        toast({
                          title: "Copiado!",
                          description: "Código PIX copiado para a área de transferência",
                        });
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground text-center">
                <p>Valor: R$ {pixData.amount?.toFixed(2)}</p>
                {pixData.expires_at && (
                  <p className="mt-1">
                    Expira em: {new Date(pixData.expires_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-center text-sm text-muted-foreground">
                <p>Aguardando confirmação do pagamento...</p>
                <p className="mt-1">Feche esta janela após efetuar o pagamento.</p>
              </div>
              <Button variant="outline" onClick={onCancel} className="w-full">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
