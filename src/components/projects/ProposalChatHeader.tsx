import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, CheckCircle, DollarSign, Clock, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
        <>
          <Button size="sm" onClick={onAccept} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Aceitar Proposta
          </Button>
          <Button size="sm" onClick={onMakeCounterProposal} variant="outline">
            Fazer Contra-Proposta
          </Button>
        </>
      );
    }

    // Aguardando aceitação de contra-proposta
    if (proposal.awaiting_acceptance_from) {
      const isAwaiting = proposal.awaiting_acceptance_from === currentProfileId;
      if (isAwaiting) {
        return (
          <>
            <Button size="sm" onClick={onAccept} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Aceitar Contra-Proposta
            </Button>
            <Button size="sm" onClick={onMakeCounterProposal} variant="outline">
              Nova Contra-Proposta
            </Button>
          </>
        );
      } else {
        return (
          <Badge variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            Aguardando outra parte
          </Badge>
        );
      }
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
    <div className="border-b bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">
              R$ {proposal.current_proposal_amount?.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h3>
            {getStatusBadge()}
          </div>
          {proposal.payment_status === 'paid_escrow' && !isOwner && (
            <p className="text-sm text-muted-foreground mt-1">
              💰 Valor em garantia - será liberado após conclusão
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {renderActionButtons()}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewHistory}>
                Histórico de Alterações
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