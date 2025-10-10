import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface PaymentSettings {
  id: string;
  pix_key: string;
  pix_key_type: string;
  bank_account_holder: string;
}

interface WalletBalance {
  available: number;
  pending: number;
}

export default function PaymentSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [balance, setBalance] = useState<WalletBalance>({ available: 0, pending: 0 });
  
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Get user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Get payment settings
      const { data: settings, error: settingsError } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      if (settings) {
        setPaymentSettings(settings);
        setPixKey(settings.pix_key || '');
        setPixKeyType(settings.pix_key_type || '');
        setAccountHolder(settings.bank_account_holder || '');
      }

      // Get wallet balance
      const { data: walletData } = await supabase
        .rpc('get_freelancer_wallet_balance', { freelancer_profile_id: profile.id });

      if (walletData && walletData.length > 0) {
        setBalance({
          available: Number(walletData[0].available) || 0,
          pending: Number(walletData[0].pending) || 0,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar suas configurações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!pixKey || !pixKeyType || !accountHolder) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos para continuar.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      if (paymentSettings) {
        // Update existing
        const { error } = await supabase
          .from('payment_settings')
          .update({
            pix_key: pixKey,
            pix_key_type: pixKeyType,
            bank_account_holder: accountHolder,
          })
          .eq('id', paymentSettings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('payment_settings')
          .insert({
            profile_id: profile.id,
            pix_key: pixKey,
            pix_key_type: pixKeyType,
            bank_account_holder: accountHolder,
          });

        if (error) throw error;
      }

      toast({
        title: 'Configurações salvas',
        description: 'Suas informações de pagamento foram atualizadas com sucesso!',
      });

      await loadData();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar suas configurações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async () => {
    if (balance.available <= 0) {
      toast({
        title: 'Saldo insuficiente',
        description: 'Você não tem saldo disponível para saque.',
        variant: 'destructive',
      });
      return;
    }

    if (!pixKey || !pixKeyType) {
      toast({
        title: 'Configure sua chave PIX',
        description: 'Você precisa configurar uma chave PIX antes de solicitar saques.',
        variant: 'destructive',
      });
      return;
    }

    setWithdrawing(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Create withdrawal request
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          profile_id: profile.id,
          amount: balance.available,
          pix_key: pixKey,
          pix_key_type: pixKeyType,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: 'Saque solicitado!',
        description: `Sua solicitação de saque de R$ ${balance.available.toFixed(2)} foi enviada e será processada em até 2 dias úteis.`,
      });

      await loadData();
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      toast({
        title: 'Erro ao solicitar saque',
        description: 'Não foi possível processar sua solicitação de saque.',
        variant: 'destructive',
      });
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-woorkins">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Configurações de Pagamento</h1>
            <p className="text-muted-foreground">
              Configure sua chave PIX para receber pagamentos
            </p>
          </div>

          {/* Wallet Balance */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Saldo na Carteira</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold">R$ {balance.pending.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Disponível</p>
                <p className="text-2xl font-bold">R$ {balance.available.toFixed(2)}</p>
              </div>
            </div>

            {balance.available > 0 && pixKey && (
              <Button 
                onClick={handleWithdraw} 
                disabled={withdrawing}
                className="w-full"
              >
                {withdrawing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  `Solicitar Saque (R$ ${balance.available.toFixed(2)})`
                )}
              </Button>
            )}
          </Card>

          {/* PIX Configuration */}
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Chave PIX</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pixKeyType">Tipo de Chave</Label>
                <Select value={pixKeyType} onValueChange={setPixKeyType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
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
                <Label htmlFor="pixKey">Chave PIX</Label>
                <Input
                  id="pixKey"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Digite sua chave PIX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountHolder">Titular da Conta</Label>
                <Input
                  id="accountHolder"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Nome completo do titular"
                />
              </div>

              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Configurações'
                )}
              </Button>
            </div>

            {paymentSettings && (
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">
                      Chave PIX configurada!
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                      Você já pode solicitar saques quando tiver saldo disponível.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* How it works */}
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Como funciona?</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium text-foreground">Cliente paga</p>
                  <p>O valor fica retido (escrow) até você entregar o serviço</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium text-foreground">Cliente libera pagamento</p>
                  <p>Após confirmar o serviço, o saldo vai para "Disponível"</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium text-foreground">Você solicita o saque</p>
                  <p>O pagamento é processado via PIX em até 2 dias úteis</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}