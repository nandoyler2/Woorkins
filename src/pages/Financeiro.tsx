import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Wallet, DollarSign, TrendingUp, Download, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
}

export default function Financeiro() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    document.title = 'Financeiro - Woorkins';
  }, []);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState({ available: 0, pending: 0, total: 0 });
  const [showBalance, setShowBalance] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cpf');
  const [accountHolder, setAccountHolder] = useState('');
  const [profileName, setProfileName] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    loadFinancialData();
  }, [user]);

  const loadFinancialData = async () => {
    if (!user) return;

    // Buscar perfil
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('user_id', user.id)
      .single();

    if (!profileData) return;
    
    setProfileName(profileData.full_name);

    // Buscar saldo
    const { data: walletData } = await supabase
      .rpc('get_freelancer_wallet_balance', { freelancer_profile_id: profileData.id });

    if (walletData && walletData.length > 0) {
      setBalance(walletData[0]);
    }

    // Buscar configurações de pagamento
    const { data: paymentSettings } = await supabase
      .from('payment_settings')
      .select('pix_key, pix_key_type, bank_account_holder')
      .eq('profile_id', profileData.id)
      .maybeSingle();

    if (paymentSettings) {
      setPixKey(paymentSettings.pix_key || '');
      setPixKeyType(paymentSettings.pix_key_type || 'cpf');
      setAccountHolder(paymentSettings.bank_account_holder || '');
    }

    // Buscar transações
    const { data: transactionsData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (transactionsData) {
      setTransactions(transactionsData);
    }
  };

  const handleSavePixKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('user_id', user?.id)
        .single();

      if (!profileData) throw new Error('Perfil não encontrado');

      const { error } = await supabase
        .from('payment_settings')
        .upsert({
          profile_id: profileData.id,
          pix_key: pixKey,
          pix_key_type: pixKeyType,
          bank_account_holder: profileData.full_name,
        });

      if (error) throw error;

      toast({
        title: 'Chave PIX salva!',
        description: 'Sua chave PIX foi cadastrada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Digite um valor válido para saque.',
        variant: 'destructive',
      });
      return;
    }

    if (amount > balance.available) {
      toast({
        title: 'Saldo insuficiente',
        description: 'Você não possui saldo suficiente para este saque.',
        variant: 'destructive',
      });
      return;
    }

    if (!pixKey) {
      toast({
        title: 'Chave PIX não cadastrada',
        description: 'Cadastre sua chave PIX antes de solicitar um saque.',
        variant: 'destructive',
      });
      return;
    }


    setLoading(true);

    try {
      toast({
        title: 'Processando saque...',
        description: 'Aguarde enquanto validamos seus dados e processamos a transferência PIX.',
      });

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profileData) throw new Error('Perfil não encontrado');

      // Criar withdrawal request
      const { data: withdrawal, error: insertError } = await supabase
        .from('withdrawal_requests')
        .insert({
          profile_id: profileData.id,
          amount: amount,
          pix_key: pixKey,
          pix_key_type: pixKeyType,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Processar saque imediatamente via edge function
      const { data, error: functionError } = await supabase.functions.invoke(
        'process-withdrawal-mercadopago',
        {
          body: { withdrawal_id: withdrawal.id }
        }
      );

      if (functionError) throw functionError;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao processar saque');
      }

      toast({
        title: 'Saque processado com sucesso!',
        description: `R$ ${amount.toFixed(2)} foi enviado via PIX para ${pixKeyType.toUpperCase()}: ${data.pix_key_masked}`,
      });

      setWithdrawAmount('');
      loadFinancialData();
    } catch (error: any) {
      toast({
        title: 'Erro ao processar saque',
        description: error.message || 'Não foi possível processar sua solicitação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/painel">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-4xl font-bold">Financeiro</h1>
              <p className="text-muted-foreground">Gerencie suas finanças e saques</p>
            </div>
          </div>

          {/* Resumo do Saldo */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Saldo Disponível</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowBalance(!showBalance)}
                  >
                    {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-3xl font-bold">
                  {showBalance ? `R$ ${balance.available.toFixed(2)}` : '••••••'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-2">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">Saldo Pendente</p>
                <p className="text-3xl font-bold">
                  {showBalance ? `R$ ${balance.pending.toFixed(2)}` : '••••••'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-2">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">Total Ganho</p>
                <p className="text-3xl font-bold">
                  {showBalance ? `R$ ${balance.total.toFixed(2)}` : '••••••'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pix" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pix">Chave PIX</TabsTrigger>
              <TabsTrigger value="saque">Solicitar Saque</TabsTrigger>
              <TabsTrigger value="extrato">Extrato</TabsTrigger>
            </TabsList>

            {/* Chave PIX */}
            <TabsContent value="pix">
              <Card className="bg-card/50 backdrop-blur-sm border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Chave PIX
                  </CardTitle>
                  <CardDescription>Cadastre sua chave PIX para receber pagamentos</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSavePixKey} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tipo de Chave</Label>
                      <Select value={pixKeyType} onValueChange={setPixKeyType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="telefone">Telefone</SelectItem>
                          <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Chave PIX</Label>
                      <Input
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        placeholder="Digite sua chave PIX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Titular da Conta</Label>
                      <div className="p-3 bg-muted rounded-lg border border-border">
                        <p className="text-sm font-medium">{profileName || 'Carregando...'}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ℹ️ O nome do titular é o mesmo cadastrado no seu perfil
                      </p>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-primary hover:shadow-glow transition-all" 
                      disabled={loading}
                    >
                      {loading ? 'Salvando...' : 'Salvar Chave PIX'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Solicitar Saque */}
            <TabsContent value="saque">
              <Card className="bg-card/50 backdrop-blur-sm border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Solicitar Saque
                  </CardTitle>
                  <CardDescription>
                    Saldo disponível: R$ {balance.available.toFixed(2)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRequestWithdraw} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Valor do Saque</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    {pixKey && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Chave PIX cadastrada:</p>
                        <p className="text-sm font-medium">{pixKey}</p>
                      </div>
                    )}
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-primary hover:shadow-glow transition-all" 
                      disabled={loading || !withdrawAmount || !pixKey}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {loading ? 'Processando saque via PIX...' : 'Solicitar Saque Imediato'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Extrato */}
            <TabsContent value="extrato">
              <Card className="bg-card/50 backdrop-blur-sm border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Extrato de Transações
                  </CardTitle>
                  <CardDescription>Histórico das suas transações</CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma transação encontrada
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div>
                            <p className="font-medium capitalize">{transaction.type}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${
                              transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {transaction.type === 'credit' ? '+' : '-'}R$ {transaction.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{transaction.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
}
