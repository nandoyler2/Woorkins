import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { WoorkoinsStripeCheckout } from "./WoorkoinsStripeCheckout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, CreditCard } from "lucide-react";
import woorkoinsIcon from "@/assets/woorkoins-icon-latest.png";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeGateway, setActiveGateway] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [pixData, setPixData] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Dados do cliente
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerDocument, setCustomerDocument] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");


  useEffect(() => {
    loadGatewayConfig();
    if (user?.email) {
      setCustomerEmail(user.email);
    }
  }, [user]);

  const isValidEmail = (email: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
  const isValidFullName = (name: string) => name.trim().split(/\s+/).length >= 2;
  const isValidDocument = (doc: string) => {
    const d = (doc || '').replace(/\D/g, '');
    return d.length === 11 || d.length === 14;
  };

  // Escutar mudanças na tabela de pagamentos Efí via Realtime
  useEffect(() => {
    if (!user || !open || !pixData) return;

    const channel = supabase
      .channel('woorkoins-efi-payments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'woorkoins_efi_payments',
          filter: `charge_id=eq.${pixData.charge_id}`,
        },
        (payload: any) => {
          console.log('Mudança detectada no pagamento:', payload);
          if (payload.new.status === 'paid') {
            toast({
              title: "Pagamento confirmado!",
              description: `${amount} Woorkoins foram creditados na sua conta!`,
            });
            onSuccess();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, open, pixData, amount, toast, onSuccess]);

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

  const handleEfiPixPayment = async () => {
    // Validações básicas antes de chamar a função
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

    setProcessingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke("efi-create-pix-charge", {
        body: {
          amount: price,
          description: `Compra de ${amount} Woorkoins`,
          customer: {
            name: nameTrimmed,
            email: emailTrimmed.toLowerCase(),
            document: docDigits,
          },
          woorkoins_amount: amount,
          woorkoins_price: price,
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
      setProcessingPayment(false);
    }
  };

  const handleEfiCardPayment = async () => {
    toast({
      title: "Pagamento com cartão em desenvolvimento",
      description: "Use PIX por enquanto",
    });
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
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

  // Se for Efí, renderizar o checkout da Efí
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={woorkoinsIcon} alt="Woorkoins" className="h-6 w-auto object-contain" />
            Comprar Woorkoins
          </DialogTitle>
          <p className="sr-only">Escolha o método de pagamento e gere o QR Code PIX</p>
        </DialogHeader>

        <div className="bg-muted p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-center gap-3">
            <img src={woorkoinsIcon} alt="Woorkoins" className="h-12 w-auto object-contain" />
            <div>
              <p className="text-2xl font-bold">{amount} Woorkoins</p>
              <p className="text-sm text-muted-foreground">Total: R$ {price.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {!pixData ? (
          <>
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

                  <Button
                    onClick={handleEfiPixPayment}
                    disabled={
                      processingPayment ||
                      !isValidFullName(customerName) ||
                      !isValidEmail(customerEmail) ||
                      !isValidDocument(customerDocument)
                    }
                    className="w-full"
                  >
                    {processingPayment ? (
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
                </div>
              </TabsContent>

              <TabsContent value="card">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Pagamento com cartão via Efí Pay em breve.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Use PIX por enquanto.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Cancelar
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-background border rounded-lg p-4 space-y-4">
              {pixData.qrcode_image && (
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${pixData.qrcode_image}`}
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
                <p className="mt-1">Seu saldo será creditado automaticamente após a confirmação.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setPixData(null);
                  onOpenChange(false);
                }}
                className="w-full"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
