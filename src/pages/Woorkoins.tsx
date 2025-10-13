import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ShoppingBag, Coins, Sparkles, Gift, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import woorkoinsIcon from '@/assets/woorkoins-icon-final.png';
import { WoorkoinsStripeCheckout } from '@/components/WoorkoinsStripeCheckout';

interface WoorkoinProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'feature' | 'boost' | 'premium';
  icon: string;
}

export default function Woorkoins() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [previousBalance, setPreviousBalance] = useState(0);
  const [animatingBalance, setAnimatingBalance] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<{ amount: number; price: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'produtos' | 'comprar'>('produtos');

  const products: WoorkoinProduct[] = [
    {
      id: '1',
      name: 'Destaque no Feed',
      description: 'Destaque sua postagem no feed por 24 horas',
      price: 50,
      type: 'boost',
      icon: 'zap',
    },
    {
      id: '2',
      name: 'Perfil Premium',
      description: 'Badge premium no perfil por 30 dias',
      price: 200,
      type: 'premium',
      icon: 'sparkles',
    },
    {
      id: '3',
      name: 'Mensagem Destacada',
      description: 'Envie uma mensagem destacada para todos os seus seguidores',
      price: 100,
      type: 'feature',
      icon: 'gift',
    },
    {
      id: '4',
      name: 'Impulso de Projeto',
      description: 'Coloque seu projeto em destaque por 7 dias',
      price: 150,
      type: 'boost',
      icon: 'zap',
    },
    {
      id: '5',
      name: 'Selo Verificado',
      description: 'Adicione o selo de verificação ao seu perfil',
      price: 500,
      type: 'premium',
      icon: 'sparkles',
    },
    {
      id: '6',
      name: 'Super Destaque',
      description: 'Apareça no topo dos resultados de busca por 3 dias',
      price: 300,
      type: 'boost',
      icon: 'zap',
    },
  ];

  const coinPackages = [
    { amount: 10, price: 0.50, bonus: 0 },
    { amount: 100, price: 9.90, bonus: 0 },
    { amount: 500, price: 45.00, bonus: 50 },
    { amount: 1000, price: 85.00, bonus: 150 },
    { amount: 2500, price: 200.00, bonus: 500 },
  ];

  useEffect(() => {
    loadBalance();
  }, [user]);

  const loadBalance = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profileData) return;

    // Get woorkoins balance
    const { data: balanceData } = await supabase
      .from('woorkoins_balance')
      .select('balance')
      .eq('profile_id', profileData.id)
      .single();

    setBalance(balanceData?.balance || 0);
  };

  const handlePurchaseProduct = async (product: WoorkoinProduct) => {
    if (balance < product.price) {
      toast({
        title: 'Saldo insuficiente',
        description: 'Você não possui Woorkoins suficientes para esta compra.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Simular compra (implementar lógica real depois)
      await new Promise(resolve => setTimeout(resolve, 1000));

      setBalance(prev => prev - product.price);

      toast({
        title: 'Compra realizada!',
        description: `Você adquiriu: ${product.name}`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro na compra',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCoins = async (amount: number, price: number) => {
    if (!user) {
      console.log('No user logged in');
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para comprar Woorkoins.',
        variant: 'destructive',
      });
      return;
    }

    console.log('Starting purchase:', { amount, price });
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      console.log('Calling buy-woorkoins function...');
      const response = await supabase.functions.invoke('buy-woorkoins', {
        body: { amount, price },
      });

      console.log('Function response:', response);

      if (response.error) {
        console.error('Function error:', response.error);
        throw response.error;
      }

      if (response.data?.clientSecret) {
        console.log('Opening checkout with clientSecret...');
        setClientSecret(response.data.clientSecret);
        setSelectedPackage({ amount, price });
        setCheckoutOpen(true);
      } else {
        throw new Error('No client secret received');
      }
    } catch (error: any) {
      console.error('Error initiating purchase:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível iniciar a compra. Tente novamente.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!user || !selectedPackage) return;

    // Guardar saldo anterior
    setPreviousBalance(balance);
    
    // Carregar novo saldo
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileData) {
      const { data: balanceData } = await supabase
        .from('woorkoins_balance')
        .select('balance')
        .eq('profile_id', profileData.id)
        .single();

      const newBalance = balanceData?.balance || 0;
      const addedAmount = selectedPackage.amount;

      // Animar o saldo subindo
      setAnimatingBalance(true);
      const steps = 30;
      const increment = addedAmount / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setBalance(newBalance);
          setAnimatingBalance(false);
          clearInterval(interval);
        } else {
          setBalance(balance + (increment * currentStep));
        }
      }, 30);

      // Mostrar notificação
      toast({
        title: 'Pagamento confirmado!',
        description: `Foi adicionado ${addedAmount} Woorkoins ao seu saldo!`,
      });
    }

    setLoading(false);
  };

  // Verificar se o pagamento foi bem-sucedido (success na URL)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      handlePaymentSuccess();
      // Limpar a URL
      window.history.replaceState({}, '', '/woorkoins');
    }
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'zap': return <Zap className="w-6 h-6" />;
      case 'sparkles': return <Sparkles className="w-6 h-6" />;
      case 'gift': return <Gift className="w-6 h-6" />;
      default: return <Coins className="w-6 h-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Saldo */}
          <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-2 border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" asChild>
                    <Link to="/painel">
                      <ArrowLeft className="w-5 h-5" />
                    </Link>
                  </Button>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Seu Saldo</p>
                    <div className="flex items-center gap-3">
                      <img src={woorkoinsIcon} alt="Woorkoins" className="h-10 w-auto object-contain" />
                      <p className={`text-4xl font-bold transition-all duration-300 ${animatingBalance ? 'scale-110 text-primary' : ''}`}>
                        {Math.floor(balance).toLocaleString()}
                      </p>
                      <span className="text-2xl font-medium text-muted-foreground">Woorkoins</span>
                    </div>
                  </div>
                </div>
                <Button 
                  size="lg" 
                  className="bg-gradient-primary hover:shadow-glow"
                  onClick={() => setActiveTab('comprar')}
                >
                  <Coins className="w-5 h-5 mr-2" />
                  Comprar Mais
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'produtos' | 'comprar')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="produtos">Produtos</TabsTrigger>
              <TabsTrigger value="comprar">Comprar Woorkoins</TabsTrigger>
            </TabsList>

            {/* Produtos */}
            <TabsContent value="produtos" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Troque seus Woorkoins</h2>
                <p className="text-muted-foreground mb-6">
                  Use seus Woorkoins para desbloquear recursos especiais e impulsionar seu perfil
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Card key={product.id} className="bg-card/50 backdrop-blur-sm border-2 hover:border-primary/50 transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            product.type === 'premium' ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                            product.type === 'boost' ? 'bg-gradient-to-br from-blue-500 to-purple-500' :
                            'bg-gradient-to-br from-green-500 to-teal-500'
                          } text-white`}>
                            {getIcon(product.icon)}
                          </div>
                          <Badge variant={product.type === 'premium' ? 'default' : 'secondary'}>
                            {product.type === 'premium' ? 'Premium' : product.type === 'boost' ? 'Boost' : 'Feature'}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <CardDescription>{product.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src={woorkoinsIcon} alt="Woorkoins" className="h-6 w-auto object-contain" />
                            <span className="text-2xl font-bold">{product.price}</span>
                          </div>
                          <Button
                            onClick={() => handlePurchaseProduct(product)}
                            disabled={loading || balance < product.price}
                            className="bg-gradient-primary hover:shadow-glow"
                          >
                            <ShoppingBag className="w-4 h-4 mr-2" />
                            Trocar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Comprar Woorkoins */}
            <TabsContent value="comprar" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Pacotes de Woorkoins</h2>
                <p className="text-muted-foreground mb-6">
                  Compre Woorkoins e ganhe bônus em pacotes maiores
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {coinPackages.map((pkg, index) => (
                    <Card key={index} className={`bg-card/50 backdrop-blur-sm border-2 ${
                      pkg.bonus > 0 ? 'border-primary/50 relative overflow-hidden' : ''
                    }`}>
                      {pkg.bonus > 0 && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-gradient-primary">
                            +{pkg.bonus} Bônus
                          </Badge>
                        </div>
                      )}
                      <CardHeader className="text-center">
                        <img src={woorkoinsIcon} alt="Woorkoins" className="h-16 w-auto object-contain mx-auto mb-3" />
                        <CardTitle className="text-3xl">{pkg.amount}</CardTitle>
                        {pkg.bonus > 0 && (
                          <p className="text-sm text-muted-foreground">+ {pkg.bonus} de bônus</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <Button
                          onClick={() => handleBuyCoins(pkg.amount + pkg.bonus, pkg.price)}
                          className="w-full bg-gradient-primary hover:shadow-glow"
                          disabled={loading}
                        >
                          R$ {pkg.price.toFixed(2)}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {clientSecret && selectedPackage && (
        <WoorkoinsStripeCheckout
          open={checkoutOpen}
          onOpenChange={(open) => {
            setCheckoutOpen(open);
            if (!open) {
              // Resetar loading quando fechar
              setLoading(false);
            }
          }}
          clientSecret={clientSecret}
          amount={selectedPackage.amount}
          price={selectedPackage.price}
          onSuccess={() => {
            setCheckoutOpen(false);
            handlePaymentSuccess();
            setClientSecret('');
            setSelectedPackage(null);
          }}
        />
      )}
    </div>
  );
}
