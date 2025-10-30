import { useRef, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, CheckCircle, DollarSign, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { useCompletionCountdown } from '@/hooks/useCompletionCountdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
    owner_confirmation_deadline?: string | null;
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
  const { timeRemaining, isExpired } = useCompletionCountdown(proposal.owner_confirmation_deadline || null);
  
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [compactHeader, setCompactHeader] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const runCheck = () => {
      // Histerese para evitar "piscar": exige folga para reexibir
      const client = el.clientWidth;
      const scroll = el.scrollWidth;
      if (!compactHeader) {
        // Esconde assim que começar a cortar
        if (scroll > client - 2) setCompactHeader(true);
      } else {
        // Só reexibe com folga de 10px
        if (scroll <= client - 10) setCompactHeader(false);
      }
    };

    const debounced = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(runCheck, 120);
    };

    // Primeira checagem
    runCheck();

    const ro = new ResizeObserver(debounced);
    ro.observe(el);
    window.addEventListener('resize', debounced);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', debounced);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [projectData?.title, compactHeader]);

  const renderActionButtons = () => {
    // Projeto concluído ou em disputa - mostrar badge "Projeto Finalizado"
    if (proposal.work_status === 'completed' || proposal.work_status === 'disputed') {
      return (
        <Badge className="bg-green-600 text-white px-4 py-2 text-sm font-semibold">
          {proposal.work_status === 'completed' ? 'Projeto Finalizado' : 'Em Disputa'}
        </Badge>
      );
    }

    // Freelancer marcou como concluído - aguardando confirmação do dono
    if (proposal.work_status === 'freelancer_completed' && isOwner) {
      return (
        <div className="flex flex-col gap-2">
          <Button size="sm" onClick={onConfirmCompletion} className="bg-green-600 hover:bg-green-700 w-auto whitespace-nowrap px-3 h-9">
            <CheckCircle className="h-4 w-4 mr-2" />
            Trabalho Concluído
          </Button>
          {/* Não mostrar mais o cronômetro aqui, apenas botão */}
        </div>
      );
    }

    // Freelancer vê badge quando marcou como concluído
    if (proposal.work_status === 'freelancer_completed' && !isOwner) {
      return (
        <Badge className="bg-blue-500 text-white px-3 py-1.5 text-xs">
          Aguardando confirmação
        </Badge>
      );
    }

    // Trabalho em andamento - mostrar botão tanto para pago quanto para aceito
    if (proposal.work_status === 'in_progress' || 
        proposal.payment_status === 'captured' ||
        (proposal.payment_status === 'paid' || proposal.payment_status === 'paid_escrow')) {
      if (isOwner) {
        return (
          <Button size="sm" onClick={onConfirmCompletion} className="bg-green-600 hover:bg-green-700 w-auto whitespace-nowrap px-3 h-9">
            <CheckCircle className="h-4 w-4 mr-2" />
            Trabalho Concluído
          </Button>
        );
      } else {
        // Freelancer pode marcar como finalizado
        return (
          <Button size="sm" onClick={onMarkCompleted} className="bg-green-600 hover:bg-green-700 w-auto whitespace-nowrap px-3 h-9">
            <CheckCircle className="h-4 w-4 mr-2" />
            Projeto Concluído
          </Button>
        );
      }
    }

    // Proposta aceita - aguardando pagamento
    if (proposal.status === 'accepted' && proposal.payment_status !== 'paid' && isOwner) {
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
      // Mostrar "Aguardando..." quando a outra parte precisa responder
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
          <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
          <span className="text-sm font-medium text-muted-foreground">Aguardando...</span>
        </div>
      );
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
      <div className="flex items-center justify-between gap-4 relative">
        {/* Coluna esquerda: Info do projeto */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50 w-fit flex-shrink-0 z-10">
          {projectData && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  {isOwner ? 'Seu Projeto' : `Projeto de ${projectData.ownerName}`}
                </h2>
              </div>
              <div 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => window.open(`/projetos/${projectData.id}`, '_blank')}
              >
                <h3 ref={titleRef} className="text-sm md:text-base font-bold text-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                  {projectData.title}
                </h3>
                <ExternalLink className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            </div>
          )}
        </div>

        {/* Centro: Valor - SEMPRE no meio absoluto */}
        <div className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center px-2 md:px-3 py-1 md:py-1.5 rounded-lg border-2 shadow-md z-20 ${
          proposal.payment_status === 'paid' || proposal.payment_status === 'paid_escrow' || proposal.payment_status === 'captured'
            ? 'bg-gradient-to-r from-green-500/10 via-green-500/5 to-green-500/10 border-green-500/30'
            : 'bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/30'
        }`}>
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] md:text-xs font-medium text-muted-foreground">R$</span>
            <span className={`text-base md:text-xl font-bold ${
              proposal.payment_status === 'paid' || proposal.payment_status === 'paid_escrow' || proposal.payment_status === 'captured'
                ? 'text-green-600 dark:text-green-500'
                : 'text-primary'
            }`}>
              {proposal.current_proposal_amount?.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <span className="text-[8px] md:text-[10px] font-medium text-muted-foreground mt-0.5 whitespace-nowrap">
            {proposal.payment_status === 'paid' || proposal.payment_status === 'paid_escrow' || proposal.payment_status === 'captured'
              ? 'Projeto pago'
              : 'Proposta'}
          </span>
        </div>

        {/* Coluna direita: Botões de ação */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto z-10">
          {renderActionButtons()}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hover:bg-primary/10 h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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