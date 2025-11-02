import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, FileText, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ViewProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: {
    budget: number;
    delivery_days: number;
    message: string;
    created_at: string;
  } | null;
  projectTitle: string;
}

export function ViewProposalDialog({ open, onOpenChange, proposal, projectTitle }: ViewProposalDialogProps) {
  if (!proposal) return null;

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
    } catch {
      return "há alguns momentos";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-base">{projectTitle}</h3>
            <p className="text-sm text-muted-foreground">Sua proposta enviada</p>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">Valor</span>
              </div>
              <p className="text-lg font-bold">R$ {proposal.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Prazo de Entrega</span>
              </div>
              <p className="text-lg font-bold">{proposal.delivery_days} {proposal.delivery_days === 1 ? 'dia' : 'dias'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mensagem da Proposta</label>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm whitespace-pre-wrap">{proposal.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3 h-3" />
            <span>Enviada {formatTimeAgo(proposal.created_at)}</span>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
