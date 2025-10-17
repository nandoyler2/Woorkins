import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Crown, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { PlanCheckout } from '@/components/PlanCheckout';

interface Plan {
  id: string;
  name: string;
  slug: string;
  commission_percentage: number;
  features: Array<{ text: string; included: boolean }>;
  display_order: number;
  recommended: boolean;
  price: number;
}

export default function Plans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>('basico');
  const [loading, setLoading] = useState(true);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPlans();
    if (user) {
      loadCurrentPlan();
    }
  }, [user]);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .order('display_order');

      if (error) throw error;
      
      // Definir preços dos planos
      const planPrices: Record<string, number> = {
        'basico': 0,
        'prata': 29.90,
        'ouro': 49.90,
        'diamante': 99.90
      };

      setPlans((data || []).map(p => ({
        ...p,
        price: planPrices[p.slug] || 0,
        features: typeof p.features === 'string' 
          ? JSON.parse(p.features) 
          : (p.features as any)
      })));
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar planos',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentPlan = async () => {
    if (!user) return;

    try {
      const { data: subscription } = await supabase
        .from('user_subscription_plans')
        .select('plan_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscription) {
        setCurrentPlan(subscription.plan_type);
      } else {
        setCurrentPlan('basico');
      }
    } catch (error: any) {
      console.error('Error loading current plan:', error);
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Você precisa estar logado para assinar um plano.',
        variant: 'destructive'
      });
      return;
    }

    // Se é o plano gratuito
    if (plan.price === 0) {
      toast({
        title: 'Plano Básico',
        description: 'Este é o plano gratuito padrão.',
      });
      return;
    }

    // Se já está no plano
    if (currentPlan === plan.slug) {
      toast({
        title: 'Plano atual',
        description: 'Você já está neste plano.',
      });
      return;
    }

    setLoadingPayment(true);
    setSelectedPlan(plan);

    try {
      // Verificar gateway ativo
      const { data: gatewayConfig } = await supabase
        .from("payment_gateway_config")
        .select("active_gateway")
        .single();

      const activeGateway = gatewayConfig?.active_gateway || "stripe";

      if (activeGateway === "mercadopago" || activeGateway === "efi") {
        setCheckoutOpen(true);
        setLoadingPayment(false);
        return;
      }

      // Para Stripe, criar payment intent
      const response = await supabase.functions.invoke('buy-plan', {
        body: { plan_id: plan.id },
      });

      if (response.error) {
        throw response.error;
      }

      if (response.data?.clientSecret) {
        setClientSecret(response.data.clientSecret);
        setCheckoutOpen(true);
        setLoadingPayment(false);
      } else {
        throw new Error('No client secret received');
      }
    } catch (error: any) {
      console.error('Error initiating plan purchase:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível iniciar a compra.',
        variant: 'destructive',
      });
      setLoadingPayment(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!user || !selectedPlan) return;

    try {
      const piId = clientSecret?.split('_secret_')[0];
      if (piId) {
        await supabase.functions.invoke('confirm-plan-payment', {
          body: { payment_intent_id: piId },
        });
      }
    } catch (e: any) {
      console.error('Confirm plan payment error:', e);
    }

    await loadCurrentPlan();

    toast({
      title: 'Plano ativado!',
      description: `Bem-vindo ao plano ${selectedPlan.name}!`,
    });

    setCheckoutOpen(false);
    setLoadingPayment(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Escolha seu Plano
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Quanto melhor o plano, menor a taxa de serviço e mais recursos você tem acesso!
          </p>
          {user && currentPlan && (
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="text-sm py-1 px-3">
                Seu plano atual: <span className="font-bold ml-1 capitalize">{currentPlan}</span>
              </Badge>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-12">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.slug;
            const isFree = plan.price === 0;
            
            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                  isCurrentPlan
                    ? 'border-primary border-3 shadow-xl ring-2 ring-primary/20'
                    : plan.recommended
                    ? 'border-primary/60 border-2 shadow-lg'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                {/* Badge de Plano Atual */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-primary shadow-glow">
                      <Crown className="w-3 h-3 mr-1" />
                      Seu Plano
                    </Badge>
                  </div>
                )}

                {/* Badge Recomendado */}
                {plan.recommended && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge variant="secondary" className="shadow-md">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Recomendado
                    </Badge>
                  </div>
                )}

                {/* Gradiente de fundo para plano atual */}
                {isCurrentPlan && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
                )}

                <div className="p-6 space-y-6">
                  {/* Cabeçalho do Plano */}
                  <div className="text-center space-y-3">
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    
                    {/* Preço */}
                    <div className="space-y-1">
                      {isFree ? (
                        <div className="text-4xl font-bold text-primary">Grátis</div>
                      ) : (
                        <>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-sm text-muted-foreground">R$</span>
                            <span className="text-4xl font-bold">{plan.price.toFixed(2)}</span>
                            <span className="text-sm text-muted-foreground">/mês</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Taxa de Comissão */}
                    <div className="flex items-center justify-center gap-2 text-lg">
                      <span className="text-3xl font-bold text-primary">
                        {plan.commission_percentage}%
                      </span>
                      <span className="text-sm text-muted-foreground">de taxa</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 min-h-[280px]">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
                        )}
                        <span
                          className={`text-sm ${
                            feature.included
                              ? 'text-foreground'
                              : 'text-muted-foreground/60 line-through'
                          }`}
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Botão de Ação */}
                  <Button
                    className="w-full"
                    size="lg"
                    variant={isCurrentPlan ? 'secondary' : plan.recommended ? 'default' : 'outline'}
                    disabled={isCurrentPlan || loadingPayment}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {loadingPayment && selectedPlan?.id === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : isCurrentPlan ? (
                      'Plano Atual'
                    ) : isFree ? (
                      'Plano Básico'
                    ) : (
                      `Assinar ${plan.name}`
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Informações Adicionais */}
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <div className="p-6 text-center space-y-2">
              <p className="text-lg">
                💡 <strong>Dica:</strong> A taxa é cobrada apenas quando você{' '}
                <strong className="text-primary">recebe</strong> pagamentos.
              </p>
              <p className="text-muted-foreground">
                Para contratar freelancers, não há taxas adicionais!
              </p>
            </div>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            <p>Cancele ou faça upgrade do seu plano a qualquer momento.</p>
          </div>
        </div>
      </main>
      <Footer />

      {/* Checkout Dialog */}
      {selectedPlan && (
        <PlanCheckout
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          planId={selectedPlan.id}
          planName={selectedPlan.name}
          planPrice={selectedPlan.price}
          onSuccess={handlePaymentSuccess}
          clientSecret={clientSecret}
        />
      )}
    </div>
  );
}
