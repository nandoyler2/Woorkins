import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, CheckCircle, DollarSign, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectData {
  id: string;
  title: string;
  ownerName: string;
  freelancerName: string;
}

interface ProposalChatHeaderProps {
  proposal: {
    id: string;
    status: string;
    payment_status?: string;
    work_status?: string;
    current_proposal_amount: number;
    is_unlocked: boolean;
    awaiting_acceptance_from?: string;
  };
  projectData?: ProjectData;
  currentProfileId: string;
  isOwner: boolean;
  onAccept?: () => void;
  onPay?: () => void;
  onConfirmCompletion?: () => void;
  onMarkCompleted?: () => void;
  onMakeCounterProposal?: () => void;
  onViewHistory?: () => void;
  onOpenDispute?: () => void;
}

export function ProposalChatHeader({
  proposal,
  projectData,
  currentProfileId,
  isOwner,
  onAccept,
  onPay,
  onConfirmCompletion,
  onMarkCompleted,
  onMakeCounterProposal,
  onViewHistory,
  onOpenDispute,
}: ProposalChatHeaderProps) {
  const getStatusBadge = () => {
    if (proposal.work_status === 'completed') {
      return <Badge className="bg-green-500">Concluído</Badge>;
    }
    if (proposal.work_status === 'disputed') {
      return <Badge variant="destructive">Em Disputa</Badge>;
    }
    if (proposal.work_status === 'freelancer_completed') {
      return <Badge className="bg-blue-500">Aguardando Confirmação</Badge>;
    }
    if (proposal.work_status === 'in_progress') {
      return <Badge className="bg-yellow-500">Em Andamento</Badge>;
    }
    if (proposal.payment_status === 'paid_escrow') {
      return <Badge className="bg-yellow-500">Pago - Em Andamento</Badge>;
    }
    if (proposal.status === 'accepted') {
      return <Badge className="bg-blue-500">Aceita - Aguardando Pagamento</Badge>;
    }
    if (proposal.awaiting_acceptance_from) {
      return <Badge variant="outline">Aguardando Resposta</Badge>;
    }
    if (proposal.status === 'pending') {
      return <Badge variant="secondary">Pendente</Badge>;
    }
    return <Badge variant="secondary">{proposal.status}</Badge>;
  };

  const renderActionButtons = () => {
    // Projeto concluído
    if (proposal.work_status === 'completed') {
      return null;
    }

    // Em disputa
    if (proposal.work_status === 'disputed') {
      return (
        <Button size="sm" variant="outline" onClick={onViewHistory}>
          <AlertCircle className="h-4 w-4 mr-2" />
          Ver Disputa
        </Button>
      );
    }

    // Freelancer marcou como concluído - aguardando confirmação do dono
    if (proposal.work_status === 'freelancer_completed' && isOwner) {
      return (
        <>
          <Button size="sm" onClick={onConfirmCompletion} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmar Finalização
          </Button>
        </>
      );
    }

    // Trabalho em andamento
    if (proposal.work_status === 'in_progress') {
      if (isOwner) {
        return (
          <Button size="sm" onClick={onConfirmCompletion} variant="outline">
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmar Finalização
          </Button>
        );
      } else {
        // Freelancer pode marcar como finalizado
        return (
          <Button size="sm" onClick={onMarkCompleted} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Finalizei o Serviço
          </Button>
        );
      }
    }

    // Proposta aceita - aguardando pagamento
    if (proposal.status === 'accepted' && isOwner) {
      return (
        <Button size="sm" onClick={onPay} className="bg-green-600 hover:bg-green-700">
          <DollarSign className="h-4 w-4 mr-2" />
          Pagar para Iniciar
        </Button>
      );
    }

    // Proposta pendente de aceitação
    if (proposal.status === 'pending' && isOwner) {
      return (
        <div className="flex flex-col gap-1.5">
          <Button size="sm" onClick={onAccept} className="bg-green-600 hover:bg-green-700 h-8 text-xs">
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            Aceitar Proposta
          </Button>
          <Button size="sm" onClick={onMakeCounterProposal} variant="outline" className="h-8 text-xs">
            Fazer Contra-Proposta
          </Button>
        </div>
      );
    }

    // Aguardando aceitação de contra-proposta
    if (proposal.awaiting_acceptance_from) {
      const isAwaiting = proposal.awaiting_acceptance_from === currentProfileId;
      if (isAwaiting) {
        return (
          <div className="flex flex-col gap-1.5">
            <Button size="sm" onClick={onAccept} className="bg-green-600 hover:bg-green-700 h-8 text-xs">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Aceitar Contra-Proposta
            </Button>
            <Button size="sm" onClick={onMakeCounterProposal} variant="outline" className="h-8 text-xs">
              Nova Contra-Proposta
            </Button>
          </div>
        );
      }
      // Não mostrar badge "Aguardando outra parte"
      return null;
    }

    // Freelancer pode refazer proposta se não está desbloqueada
    if (!proposal.is_unlocked && !isOwner) {
      return (
        <Button size="sm" onClick={onMakeCounterProposal} variant="outline">
          Refazer Proposta
        </Button>
      );
    }

    return null;
  };

  return (
    <div className="border-b bg-gradient-to-br from-background via-primary/5 to-background p-4 shadow-sm">
      <div className="flex items-center gap-6">
        {/* Coluna esquerda: Info do projeto - redesenhada */}
        <div className="flex-1 min-w-0 bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50">
          {projectData && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {isOwner ? 'Seu Projeto' : `Projeto de ${projectData.ownerName}`}
                </h2>
              </div>
              <h3 
                className="text-base font-bold truncate text-foreground hover:text-primary cursor-pointer transition-colors"
                onClick={() => window.open(`/projetos/${projectData.id}`, '_blank')}
              >
                {projectData.title}
              </h3>
            </div>
          )}
        </div>

        {/* Centro: Valor + Status - tamanho reduzido */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-2 border-primary/30 shadow-md">
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-medium text-muted-foreground">R$</span>
            <span className="text-2xl font-bold text-primary">
              {proposal.current_proposal_amount?.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="h-6 w-px bg-primary/30" />
          {getStatusBadge()}
        </div>

        {/* Coluna direita: Botões de ação - melhorados */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {projectData && (
            <Button 
              variant="outline" 
              size="sm"
              className="shadow-sm hover:shadow-md transition-shadow"
              onClick={() => window.open(`/projetos/${projectData.id}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Projeto
            </Button>
          )}
          
          {renderActionButtons()}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hover:bg-primary/10">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onViewHistory}>
                Atividades
              </DropdownMenuItem>
              {proposal.payment_status === 'paid_escrow' && (
                <DropdownMenuItem onClick={onOpenDispute}>
                  Abrir Reclamação
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}