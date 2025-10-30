import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Eye, User } from 'lucide-react';
import { formatDateTimeSaoPaulo, maskPixKey } from '@/lib/utils';
import { WithdrawalDetailsDialog } from '@/components/admin/WithdrawalDetailsDialog';
import { ConfirmPaymentDialog } from '@/components/admin/ConfirmPaymentDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WithdrawalRequest {
  id: string;
  profile_id: string;
  amount: number;
  pix_key: string;
  pix_key_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  receipt_url: string | null;
  admin_notes: string | null;
  processed_by: string | null;
  profiles: {
    full_name: string;
    cpf: string;
    user_id: string;
  };
}

export default function WithdrawalRequests() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  useEffect(() => {
    filterWithdrawals();
  }, [withdrawals, statusFilter, searchTerm]);

  const loadWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar perfis para cada withdrawal
      const profileIds = [...new Set(data?.map(w => w.profile_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, cpf, user_id')
        .in('id', profileIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const withdrawalsWithProfiles = data?.map(w => ({
        ...w,
        profiles: profilesMap.get(w.profile_id) || { full_name: '', cpf: '', user_id: '' }
      })) || [];

      setWithdrawals(withdrawalsWithProfiles as any);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
      toast({
        title: 'Erro ao carregar solicitações',
        description: 'Não foi possível carregar as solicitações de saque.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterWithdrawals = () => {
    let filtered = withdrawals;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(w => w.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(w => 
        w.profiles.full_name.toLowerCase().includes(term) ||
        w.profiles.cpf.includes(term)
      );
    }

    setFilteredWithdrawals(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'completed':
        return <Badge className="bg-green-600">Concluído</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleViewDetails = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setShowDetailsDialog(true);
  };

  const handleConfirmPayment = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setShowConfirmDialog(true);
  };

  const handlePaymentConfirmed = () => {
    setShowConfirmDialog(false);
    loadWithdrawals();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Solicitações de Saques</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as solicitações de saque dos usuários
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Buscar por nome ou CPF</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o nome ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Solicitações */}
      <div className="grid gap-4">
        {filteredWithdrawals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma solicitação encontrada
            </CardContent>
          </Card>
        ) : (
          filteredWithdrawals.map((withdrawal) => (
            <Card key={withdrawal.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{withdrawal.profiles.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      CPF: {withdrawal.profiles.cpf}
                    </p>
                  </div>
                  {getStatusBadge(withdrawal.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Chave PIX</Label>
                    <p className="font-medium">
                      {withdrawal.pix_key_type.toUpperCase()}: {maskPixKey(withdrawal.pix_key, withdrawal.pix_key_type)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor Solicitado</Label>
                    <p className="text-2xl font-bold text-primary">
                      R$ {withdrawal.amount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data da Solicitação</Label>
                    <p className="font-medium">{formatDateTimeSaoPaulo(withdrawal.created_at)}</p>
                  </div>
                </div>

                {withdrawal.status === 'pending' && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(withdrawal)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleConfirmPayment(withdrawal)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Confirmar Pagamento
                    </Button>
                  </div>
                )}

                {withdrawal.status === 'completed' && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(withdrawal)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                    {withdrawal.receipt_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(withdrawal.receipt_url!, '_blank')}
                      >
                        Ver Comprovante
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedWithdrawal && (
        <>
          <WithdrawalDetailsDialog
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
            withdrawal={selectedWithdrawal}
          />
          <ConfirmPaymentDialog
            open={showConfirmDialog}
            onOpenChange={setShowConfirmDialog}
            withdrawal={selectedWithdrawal}
            onConfirmed={handlePaymentConfirmed}
          />
        </>
      )}
    </div>
  );
}
