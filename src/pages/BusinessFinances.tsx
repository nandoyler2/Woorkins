import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { DollarSign, TrendingUp, Clock, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BusinessFinances() {
  const [balance, setBalance] = useState({ available: 0, pending: 0, total: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setProfileId(data.id);
    }
  };

  useEffect(() => {
    if (profileId) {
      fetchBusinessProfile();
    }
  }, [profileId]);

  useEffect(() => {
    if (businessId) {
      fetchBalance();
      fetchTransactions();
      fetchWithdrawals();
    }
  }, [businessId]);

  const fetchBusinessProfile = async () => {
    const { data } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (data) {
      setBusinessId(data.id);
    }
  };

  const fetchBalance = async () => {
    if (!businessId) return;

    const { data } = await supabase.rpc('get_business_balance', {
      business_uuid: businessId,
    });

    if (data && data.length > 0) {
      setBalance({
        available: Number(data[0].available) || 0,
        pending: Number(data[0].pending) || 0,
        total: Number(data[0].total) || 0,
      });
    }
  };

  const fetchTransactions = async () => {
    if (!businessId) return;

    const { data } = await supabase
      .from('transactions')
      .select('*, negotiations(service_description)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (data) {
      setTransactions(data);
    }
  };

  const fetchWithdrawals = async () => {
    if (!businessId) return;

    const { data } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('business_id', businessId)
      .order('requested_at', { ascending: false });

    if (data) {
      setWithdrawals(data);
    }
  };

  const requestWithdrawal = async () => {
    if (!businessId) return;

    const amount = parseFloat(withdrawAmount);

    if (!amount || amount <= 0) {
      toast({
        title: 'Erro',
        description: 'Insira um valor válido',
        variant: 'destructive',
      });
      return;
    }

    if (amount > balance.available) {
      toast({
        title: 'Erro',
        description: 'Saldo insuficiente',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.from('withdrawals').insert({
      business_id: businessId,
      amount,
      status: 'pending',
      bank_details: bankDetails ? JSON.parse(bankDetails) : null,
    });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível solicitar o saque',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Saque solicitado!',
        description: 'Seu pedido será processado em até 2 dias úteis',
      });
      setWithdrawAmount('');
      setBankDetails('');
      fetchWithdrawals();
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      released: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Pendente',
      released: 'Liberado',
      cancelled: 'Cancelado',
      processing: 'Processando',
      completed: 'Concluído',
      rejected: 'Rejeitado',
    };
    return texts[status] || status;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Financeiro</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Disponível</p>
              <h3 className="text-2xl font-bold text-green-600">
                R$ {balance.available.toFixed(2)}
              </h3>
            </div>
            <DollarSign className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Pendente</p>
              <h3 className="text-2xl font-bold text-yellow-600">
                R$ {balance.pending.toFixed(2)}
              </h3>
            </div>
            <Clock className="w-12 h-12 text-yellow-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Recebido</p>
              <h3 className="text-2xl font-bold text-primary">R$ {balance.total.toFixed(2)}</h3>
            </div>
            <TrendingUp className="w-12 h-12 text-primary opacity-20" />
          </div>
        </Card>
      </div>

      <div className="flex justify-end mb-6">
        <Dialog>
          <DialogTrigger asChild>
            <Button disabled={balance.available <= 0}>
              <Download className="w-4 h-4 mr-2" />
              Solicitar Saque
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Saque</DialogTitle>
              <DialogDescription>
                Disponível: R$ {balance.available.toFixed(2)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Valor do Saque</label>
                <Input
                  type="number"
                  placeholder="R$ 0,00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  max={balance.available}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Dados Bancários (JSON)</label>
                <Textarea
                  placeholder='{"banco": "001", "agencia": "1234", "conta": "12345-6"}'
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  rows={4}
                />
              </div>
              <Button onClick={requestWithdrawal} className="w-full">
                Confirmar Saque
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Transações</h2>
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">
                    {tx.negotiations?.service_description || 'Serviço'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(tx.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">R$ {tx.amount.toFixed(2)}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getStatusColor(tx.status)}`}
                  >
                    {getStatusText(tx.status)}
                  </span>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma transação encontrada
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Saques</h2>
          <div className="space-y-3">
            {withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">Saque</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(withdrawal.requested_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">R$ {withdrawal.amount.toFixed(2)}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getStatusColor(withdrawal.status)}`}
                  >
                    {getStatusText(withdrawal.status)}
                  </span>
                </div>
              </div>
            ))}
            {withdrawals.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum saque solicitado</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
