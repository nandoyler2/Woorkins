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

interface WalletBalance {
  available: number;
  pending: number;
  total: number;
  withdrawn: number;
}

export function MyBalance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<WalletBalance>({ 
    available: 0, 
    pending: 0, 
    total: 0,
    withdrawn: 0 
  });
  const [showExtrato, setShowExtrato] = useState(false);

  useEffect(() => {
    if (user) {
      loadWallet();
    }
  }, [user]);

  const loadWallet = async () => {
    try {
      // Get user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Recalculate wallet server-side based on accepted_amount and plan commission (idempotent)
      try {
        await supabase.functions.invoke('recalculate-my-wallet');
      } catch (e) {
        console.warn('recalculate-my-wallet failed (non-blocking):', e);
      }

      // Get freelancer wallet balance
      const { data: walletData, error: walletError } = await supabase
        .rpc('get_freelancer_wallet_balance', { freelancer_profile_id: profile.id });

      if (walletError) {
        console.error('Error loading wallet:', walletError);
      } else if (walletData && walletData.length > 0) {
        setBalance({
          available: Number(walletData[0].available) || 0,
          pending: Number(walletData[0].pending) || 0,
          total: Number(walletData[0].total) || 0,
          withdrawn: Number(walletData[0].withdrawn) || 0,
        });
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      toast({
        title: 'Erro ao carregar saldo',
        description: 'Não foi possível carregar suas informações financeiras.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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
          <h3 className="text-xl font-semibold">Minha Carteira</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Pendente
              </span>
            </div>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
              R$ {balance.pending.toFixed(2)}
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Aguardando cliente liberar
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                Disponível
              </span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              R$ {balance.available.toFixed(2)}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Pronto para saque
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Total Ganho
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              R$ {balance.total.toFixed(2)}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Histórico completo
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Sacado
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              R$ {balance.withdrawn.toFixed(2)}
            </p>
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
              Total de saques
            </p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Como funciona?
              </p>
              <p className="text-blue-800 dark:text-blue-200 mt-1">
                O saldo <strong>Pendente</strong> é retido até o cliente confirmar o serviço. Após confirmação, 
                passa para <strong>Disponível</strong> e você pode solicitar saque via PIX nas configurações de pagamento.
              </p>
            </div>
          </div>
        </div>

        {balance.available > 0 && (
          <Button 
            className="w-full"
            onClick={() => window.location.href = '/configuracoes-pagamento'}
          >
            Solicitar Saque (R$ {balance.available.toFixed(2)})
          </Button>
        )}
      </Card>
    </>
  );
}