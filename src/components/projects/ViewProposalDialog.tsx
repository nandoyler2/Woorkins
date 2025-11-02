import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, FileText, DollarSign, Calendar, X } from "lucide-react";
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
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden max-h-[90vh] flex flex-col" hideClose>
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-blue-900 via-teal-700 to-blue-900 p-4 border-b shrink-0 relative">
          <DialogHeader>
            <div className="space-y-2">
              <h3 className="font-bold text-base leading-tight text-white">{projectTitle}</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1 text-blue-100 bg-blue-950/50 px-2 py-1 rounded-full">
                  <FileText className="w-3 h-3" />
                  <span>Sua proposta enviada</span>
                </div>
                <div className="flex items-center gap-1 text-blue-100 bg-blue-950/50 px-2 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(proposal.created_at)}</span>
                </div>
              </div>
            </div>
          </DialogHeader>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded-full p-1.5"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5 overflow-y-auto flex-1 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-background space-y-4">
          {/* Valores e Prazo - Grid compacto */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 dark:text-blue-100">
                <DollarSign className="w-3.5 h-3.5" />
                Valor da Proposta
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950 dark:to-teal-900 border border-blue-300 dark:border-blue-700 rounded-lg p-3 shadow-sm">
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-50">
                  R$ {proposal.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="col-span-2 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 dark:text-blue-100">
                <Calendar className="w-3.5 h-3.5" />
                Prazo
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950 dark:to-teal-900 border border-blue-300 dark:border-blue-700 rounded-lg p-3 shadow-sm">
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-50">
                  {proposal.delivery_days} {proposal.delivery_days === 1 ? 'dia' : 'dias'}
                </p>
              </div>
            </div>
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 dark:text-blue-100">
              <FileText className="w-3.5 h-3.5" />
              Mensagem da Proposta
            </div>
            <div className="border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-white dark:bg-slate-950 min-h-[120px]">
              <p className="text-sm whitespace-pre-wrap">{proposal.message}</p>
            </div>
          </div>

          {/* Botão Fechar */}
          <div className="flex justify-end pt-2">
            <Button 
              onClick={() => onOpenChange(false)}
              className="bg-gradient-to-r from-blue-600 via-teal-600 to-blue-600 hover:from-blue-700 hover:via-teal-700 hover:to-blue-700"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
