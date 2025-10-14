import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, CreditCard } from "lucide-react";
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';

interface MercadoPagoCheckoutProps {
  amount: number;
  description: string;
  onSuccess: () => void;
  onCancel: () => void;
  woorkoinsAmount?: number;
  woorkoinsPrice?: number;
}

export default function MercadoPagoCheckout({
  amount,
  description,
  onSuccess,
  onCancel,
  woorkoinsAmount,
  woorkoinsPrice,
}: MercadoPagoCheckoutProps) {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [mpInitialized, setMpInitialized] = useState(false);
  
  // Dados do cliente
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerDocument, setCustomerDocument] = useState("");

  // Polling para verificar status do pagamento PIX a cada 3 segundos (consulta o Mercado Pago)
  useEffect(() => {
    if (!pixData?.payment_id || !woorkoinsAmount) return;

    console.log('Iniciando polling de verificação de pagamento:', pixData.payment_id);
    
    const checkPaymentStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-mercadopago-payment', {
          body: { payment_id: pixData.payment_id }
        });

        if (!error && data) {
          console.log('Status do pagamento:', data);
          if (data.status === 'paid' && data.credited) {
            console.log('Pagamento confirmado via polling!');
            toast({
              title: "Pagamento PIX confirmado! 🎉",
              description: `${woorkoinsAmount} Woorkoins creditados com sucesso!`,
            });
            onSuccess();
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    };

    // Verificar após 3 segundos e depois a cada 3 segundos
    const timeout = setTimeout(checkPaymentStatus, 3000);
    const interval = setInterval(checkPaymentStatus, 3000);

    return () => {
      console.log('Parando polling de pagamento');
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [pixData, woorkoinsAmount, toast, onSuccess]);

  // Realtime para detectar confirmação de pagamento PIX
  useEffect(() => {
    if (!pixData?.payment_id || !woorkoinsAmount) return;

    console.log('Configurando listener de pagamento PIX:', pixData.payment_id);

    const channel = supabase
      .channel(`woorkoins-pix-${pixData.payment_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'woorkoins_mercadopago_payments',
          filter: `payment_id=eq.${pixData.payment_id}`,
        },
        (payload: any) => {
          console.log('Pagamento PIX atualizado em tempo real:', payload);
          if (payload.new.status === 'paid') {
            toast({
              title: "Pagamento PIX confirmado! 🎉",
              description: `${woorkoinsAmount} Woorkoins creditados com sucesso!`,
            });
            onSuccess();
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Removendo listener de pagamento PIX');
      supabase.removeChannel(channel);
    };
  }, [pixData, woorkoinsAmount, toast, onSuccess]);

  useEffect(() => {
    const loadMercadoPagoKey = async () => {
      try {
        const { data: config } = await supabase
          .from("payment_gateway_config")
          .select("mercadopago_public_key")
          .single();
        
        if (config?.mercadopago_public_key) {
          initMercadoPago(config.mercadopago_public_key);
          setMpInitialized(true);
        }
      } catch (error) {
        console.error("Erro ao carregar MP:", error);
      }
    };
    
    loadMercadoPagoKey();
  }, []);

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
          ...(woorkoinsAmount && { woorkoins_amount: woorkoinsAmount }),
          ...(woorkoinsPrice && { woorkoins_price: woorkoinsPrice }),
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

  const handleCardPayment = async (formData: any) => {
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
          paymentMethod: "card",
          amount: amount,
          description: description,
          token: formData.token,
          customer: {
            name: nameTrimmed,
            email: emailTrimmed.toLowerCase(),
            document: docDigits,
          },
          card: {
            cardholder_name: formData.payer.name,
          },
          ...(woorkoinsAmount && { woorkoins_amount: woorkoinsAmount }),
          ...(woorkoinsPrice && { woorkoins_price: woorkoinsPrice }),
        },
      });

      if (error) throw error;

      toast({
        title: "Pagamento processado!",
        description: "Seu pagamento foi aprovado com sucesso",
      });
      
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao processar cartão:", error);
      toast({
        title: "Erro ao processar pagamento",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
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

            <TabsContent value="card" className="space-y-4">
              {!mpInitialized ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Carregando Mercado Pago...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Coluna esquerda - Dados do cliente */}
                  <div className="space-y-4">
                    <div className="space-y-2">
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
                      <Label htmlFor="card-document">CPF/CNPJ</Label>
                      <Input
                        id="card-document"
                        value={customerDocument}
                        onChange={(e) => setCustomerDocument(e.target.value)}
                        placeholder="000.000.000-00"
                      />
                    </div>

                    <Button variant="outline" onClick={onCancel} className="w-full">
                      Cancelar
                    </Button>
                  </div>

                  {/* Coluna direita - Dados do cartão */}
                  <div>
                    <CardPayment
                      initialization={{ amount: amount }}
                      onSubmit={handleCardPayment}
                      customization={{
                        visual: {
                          style: {
                            theme: 'default',
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
          <div className="bg-background border rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Coluna esquerda - QR Code */}
                <div className="flex flex-col items-center justify-center space-y-4">
                  {pixData.qrcode_base64 && (
                    <div className="bg-white p-4 rounded-lg">
                      <img
                        src={`data:image/png;base64,${pixData.qrcode_base64}`}
                        alt="QR Code PIX"
                        className="w-64 h-64"
                      />
                    </div>
                  )}
                  <div className="text-center space-y-1">
                    <p className="text-2xl font-bold">R$ {pixData.amount?.toFixed(2)}</p>
                    {pixData.expires_at && (
                      <p className="text-sm text-muted-foreground">
                        Expira: {new Date(pixData.expires_at).toLocaleString("pt-BR", {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Coluna direita - Informações e código */}
                <div className="flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Como pagar:</h3>
                      <ol className="text-sm space-y-2 text-muted-foreground">
                        <li className="flex gap-2">
                          <span className="font-semibold">1.</span>
                          <span>Abra o app do seu banco</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold">2.</span>
                          <span>Escolha pagar com PIX QR Code</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold">3.</span>
                          <span>Escaneie o código ao lado</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold">4.</span>
                          <span>Confirme o pagamento</span>
                        </li>
                      </ol>
                    </div>

                    {pixData.qrcode && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Ou use o código PIX Copia e Cola:</Label>
                        <div className="flex gap-2">
                          <Input 
                            value={pixData.qrcode} 
                            readOnly 
                            className="font-mono text-xs"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(pixData.qrcode);
                              toast({
                                title: "Copiado!",
                                description: "Código PIX copiado",
                              });
                            }}
                          >
                            Copiar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Aguardando confirmação do pagamento...</span>
                    </div>
                    <Button variant="outline" onClick={onCancel} className="w-full">
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
