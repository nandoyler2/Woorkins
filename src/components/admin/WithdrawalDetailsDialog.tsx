import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { formatDateTimeSaoPaulo, maskPixKey } from '@/lib/utils';

interface WithdrawalDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawal: {
    id: string;
    profile_id: string;
    amount: number;
    pix_key: string;
    pix_key_type: string;
    status: string;
    created_at: string;
    profiles: {
      full_name: string;
      cpf: string;
      user_id: string;
    };
  };
}

interface WalletBalance {
  available: number;
  pending: number;
  total: number;
  withdrawn: number;
}

interface ProposalHistory {
  project_title: string;
  amount: number;
  completed_at: string;
  net_amount: number;
}

export function WithdrawalDetailsDialog({
  open,
  onOpenChange,
  withdrawal,
}: WithdrawalDetailsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [proposalHistory, setProposalHistory] = useState<ProposalHistory[]>([]);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (open) {
      loadDetails();
    }
  }, [open, withdrawal.profile_id]);

  const loadDetails = async () => {
    try {
      setLoading(true);

      // Buscar saldo da carteira
      const { data: walletData } = await supabase
        .rpc('get_freelancer_wallet_balance', {
          freelancer_profile_id: withdrawal.profile_id,
        });

      if (walletData && walletData.length > 0) {
        setWalletBalance(walletData[0]);
      }

      // Buscar histórico de propostas
      const { data: proposals } = await supabase
        .from('proposals')
        .select(`
          accepted_amount,
          completed_at,
          project:projects(title)
        `)
        .eq('freelancer_id', withdrawal.profile_id)
        .in('status', ['accepted', 'completed'])
        .order('completed_at', { ascending: false });

      if (proposals) {
        setProposalHistory(
          proposals.map((p: any) => ({
            project_title: p.project?.title || 'Projeto sem título',
            amount: p.accepted_amount,
            completed_at: p.completed_at,
            net_amount: p.accepted_amount * 0.9, // Assumindo 10% de taxa
          }))
        );
      }

      // Buscar email do usuário via edge function
      const { data: emailData } = await supabase.functions.invoke('get-user-email', {
        body: { user_id: withdrawal.profiles.user_id },
      });

      if (emailData?.email) {
        setUserEmail(emailData.email);
      }
    } catch (error) {
      console.error('Error loading details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Solicitação de Saque</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Informações do Usuário */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Informações do Usuário</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome Completo</Label>
                    <p className="font-medium">{withdrawal.profiles.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">CPF</Label>
                    <p className="font-medium">{withdrawal.profiles.cpf}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="font-medium">{userEmail || 'Carregando...'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Chave PIX</Label>
                    <p className="font-medium">
                      {withdrawal.pix_key_type.toUpperCase()}: {maskPixKey(withdrawal.pix_key, withdrawal.pix_key_type)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Saldo da Carteira */}
            {walletBalance && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Saldo da Carteira</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Disponível</Label>
                      <p className="text-xl font-bold text-green-600">
                        R$ {walletBalance.available.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Pendente</Label>
                      <p className="text-xl font-bold text-yellow-600">
                        R$ {walletBalance.pending.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Total Ganho</Label>
                      <p className="text-xl font-bold">R$ {walletBalance.total.toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Já Sacado</Label>
                      <p className="text-xl font-bold">R$ {walletBalance.withdrawn.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Histórico de Ganhos */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Histórico de Ganhos</h3>
                {proposalHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma proposta concluída ainda</p>
                ) : (
                  <div className="space-y-3">
                    {proposalHistory.map((proposal, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-muted rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{proposal.project_title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTimeSaoPaulo(proposal.completed_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">R$ {proposal.amount.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            Líquido: R$ {proposal.net_amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informações da Solicitação */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Detalhes da Solicitação</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor Solicitado</Label>
                    <p className="text-2xl font-bold text-primary">
                      R$ {withdrawal.amount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge>{withdrawal.status}</Badge>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Data da Solicitação</Label>
                    <p className="font-medium">{formatDateTimeSaoPaulo(withdrawal.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
