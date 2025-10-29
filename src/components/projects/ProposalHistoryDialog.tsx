import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface ProposalHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
}

interface HistoryEntry {
  id: string;
  status_type: string;
  changed_by: string;
  old_value: any;
  new_value: any;
  message: string;
  created_at: string;
  profile: {
    full_name: string;
  };
}

export function ProposalHistoryDialog({
  open,
  onOpenChange,
  proposalId,
}: ProposalHistoryDialogProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && proposalId) {
      loadHistory();
    }
  }, [open, proposalId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('proposal_status_history')
        .select(`
          *,
          profile:profiles!changed_by(full_name)
        `)
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (statusType: string) => {
    const labels: Record<string, string> = {
      proposal_sent: 'Proposta Enviada',
      counter_proposal: 'Contra-Proposta',
      accepted: 'Aceita',
      payment_made: 'Pagamento Realizado',
      work_started: 'Trabalho Iniciado',
      freelancer_completed: 'Marcado como Concluído',
      owner_confirmed: 'Confirmado pelo Cliente',
      completed: 'Concluído',
      disputed: 'Em Disputa',
    };
    return labels[statusType] || statusType;
  };

  const getValueChange = (entry: HistoryEntry) => {
    const oldAmount = entry.old_value?.amount;
    const newAmount = entry.new_value?.amount;

    if (oldAmount && newAmount) {
      const diff = newAmount - oldAmount;
      const icon = diff > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
      const color = diff > 0 ? 'text-green-600' : 'text-red-600';
      
      return (
        <div className={`flex items-center gap-1 ${color}`}>
          {icon}
          <span className="font-medium">
            R$ {oldAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} → 
            R$ {newAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      );
    }

    if (newAmount) {
      return (
        <span className="font-medium">
          R$ {newAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico da Proposta</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum histórico encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="border-l-2 border-primary pl-4 pb-4 relative"
                >
                  <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary" />
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {getStatusLabel(entry.status_type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    <div className="text-sm">
                      <p className="text-muted-foreground">
                        Por: <span className="font-medium text-foreground">{entry.profile.full_name}</span>
                      </p>
                      {getValueChange(entry)}
                    </div>

                    {entry.message && (
                      <p className="text-sm bg-muted p-2 rounded">
                        {entry.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}