import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Balance {
  available: number;
  pending: number;
  total: number;
}

interface Transaction {
  id: string;
  amount: number;
  status: string;
  type: string;
  created_at: string;
  negotiation_id: string | null;
  platform_fee: number;
  stripe_fee: number;
  gross_amount: number;
}

export function MyBalance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<Balance>({ available: 0, pending: 0, total: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showExtrato, setShowExtrato] = useState(false);

  useEffect(() => {
    if (user) {
      loadBalance();
    }
  }, [user]);

  const loadBalance = async () => {
    try {
      // Get user's business profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!businessProfile) {
        setLoading(false);
        return;
      }

      // Get balance
      const { data: balanceData, error: balanceError } = await supabase
        .rpc('get_business_balance', { business_uuid: businessProfile.id });

      if (balanceError) throw balanceError;

      if (balanceData && balanceData.length > 0) {
        setBalance({
          available: Number(balanceData[0].available) || 0,
          pending: Number(balanceData[0].pending) || 0,
          total: Number(balanceData[0].total) || 0,
        });
      }

      // Get transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessProfile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionsError) throw transactionsError;

      setTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error loading balance:', error);
      toast({
        title: 'Erro ao carregar saldo',
        description: 'Não foi possível carregar suas informações financeiras.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'released':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'released':
        return 'Liberado';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Meu Saldo</h3>
          <Button variant="outline" size="sm" onClick={() => setShowExtrato(true)}>
            Ver Extrato
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Saldo Pendente
              </span>
            </div>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
              R$ {balance.pending.toFixed(2)}
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Aguardando confirmação
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                Saldo Disponível
              </span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              R$ {balance.available.toFixed(2)}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Sendo transferido automaticamente
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Total Recebido
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              R$ {balance.total.toFixed(2)}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Histórico completo
            </p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Repasses Automáticos
              </p>
              <p className="text-blue-800 dark:text-blue-200 mt-1">
                Quando o saldo é liberado pelo cliente, o Stripe inicia automaticamente a transferência
                para sua conta cadastrada. O prazo é de 1-2 dias úteis.
              </p>
            </div>
          </div>
        </div>

        {transactions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Últimas Transações</h4>
            {transactions.slice(0, 3).map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">R$ {transaction.amount.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(transaction.created_at)}
                  </p>
                </div>
                <Badge className={getStatusColor(transaction.status)}>
                  {getStatusText(transaction.status)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={showExtrato} onOpenChange={setShowExtrato}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Extrato Completo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma transação encontrada
              </p>
            ) : (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">R$ {transaction.amount.toFixed(2)}</span>
                    <Badge className={getStatusColor(transaction.status)}>
                      {getStatusText(transaction.status)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Tipo: {transaction.type === 'payment' ? 'Pagamento' : 'Outro'}</p>
                    <p>Data: {formatDate(transaction.created_at)}</p>
                    {transaction.gross_amount > 0 && (
                      <>
                        <p>Valor Bruto: R$ {transaction.gross_amount.toFixed(2)}</p>
                        <p>Taxa Plataforma: R$ {transaction.platform_fee.toFixed(2)}</p>
                        <p>Taxa Stripe: R$ {transaction.stripe_fee.toFixed(2)}</p>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}