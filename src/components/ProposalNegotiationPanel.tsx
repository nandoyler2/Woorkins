import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { History, DollarSign, Loader2, AlertTriangle } from 'lucide-react';
import { ProposalPaymentDialog } from '@/components/projects/ProposalPaymentDialog';
import { ProposalCounterDialog } from '@/components/projects/ProposalCounterDialog';
import { ProposalHistoryDialog } from '@/components/projects/ProposalHistoryDialog';

interface ProposalNegotiationPanelProps {
  proposalId: string;
  proposalData: {
    budget: number;
    delivery_days: number;
    message: string;
    status: string;
    payment_status?: string;
    is_unlocked: boolean;
    current_proposal_amount?: number;
    current_proposal_by?: string;
    awaiting_acceptance_from?: string;
    project?: {
      title: string;
    };
  };
  isOwner: boolean;
  currentProfileId: string;
  freelancerId: string;
  ownerId: string;
  onStatusChange: () => void;
  onDelete?: () => void;
}

export function ProposalNegotiationPanel({
  proposalId,
  proposalData,
  isOwner,
  currentProfileId,
  freelancerId,
  ownerId,
  onStatusChange,
  onDelete,
}: ProposalNegotiationPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const { toast } = useToast();

  const handleAcceptProposal = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('proposals')
        .update({
          status: 'accepted',
          accepted_amount: proposalData.current_proposal_amount || proposalData.budget,
          awaiting_acceptance_from: null,
        })
        .eq('id', proposalId);

      if (error) throw error;

      toast({
        title: 'Proposta aceita!',
        description: 'Agora você precisa efetuar o pagamento para continuar.',
      });

      onStatusChange();
    } catch (error: any) {
      console.error('Error accepting proposal:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível aceitar a proposta',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendCounterProposal = async (amount: number, message: string) => {
    try {
      const otherProfileId = isOwner ? freelancerId : ownerId;

      // Create counter proposal
      const { error: counterError } = await supabase
        .from('counter_proposals')
        .insert({
          proposal_id: proposalId,
          from_profile_id: currentProfileId,
          to_profile_id: otherProfileId,
          amount,
          message,
          status: 'pending',
        });

      if (counterError) throw counterError;

      // Update proposal
      const { error: updateError } = await supabase
        .from('proposals')
        .update({
          current_proposal_amount: amount,
          current_proposal_by: currentProfileId,
          awaiting_acceptance_from: otherProfileId,
        })
        .eq('id', proposalId);

      if (updateError) throw updateError;

      toast({
        title: 'Contra-proposta enviada!',
        description: 'Aguarde a resposta da outra parte.',
      });

      onStatusChange();
    } catch (error: any) {
      console.error('Error sending counter proposal:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível enviar a contra-proposta',
      });
      throw error;
    }
  };

  const currentAmount = proposalData.current_proposal_amount || proposalData.budget;
  const isAwaitingMyAcceptance = proposalData.awaiting_acceptance_from === currentProfileId;
  const isAwaitingOtherAcceptance = proposalData.awaiting_acceptance_from && !isAwaitingMyAcceptance;

  return (
    <>
      <div className="space-y-3">
        {/* Current Proposal Amount */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Valor da Proposta</p>
            <p className="text-xl font-bold text-primary">
              R$ {currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">
              Prazo: {proposalData.delivery_days} dias
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={
                proposalData.status === 'accepted'
                  ? 'bg-green-500/10 text-green-600'
                  : proposalData.status === 'rejected'
                  ? 'bg-red-500/10 text-red-600'
                  : 'bg-yellow-500/10 text-yellow-600'
              }
            >
              {proposalData.status === 'accepted' && 'Aceito'}
              {proposalData.status === 'rejected' && 'Rejeitado'}
              {proposalData.status === 'pending' && 'Pendente'}
            </Badge>

            {proposalData.payment_status && proposalData.status === 'accepted' && (
              <Badge
                variant="secondary"
                className={
                  proposalData.payment_status === 'captured'
                    ? 'bg-green-500/10 text-green-600'
                    : proposalData.payment_status === 'pending'
                    ? 'bg-yellow-500/10 text-yellow-600'
                    : 'bg-gray-500/10 text-gray-600'
                }
              >
                {proposalData.payment_status === 'captured' && 'Pago'}
                {proposalData.payment_status === 'pending' && 'Pagamento Pendente'}
                {proposalData.payment_status === 'unpaid' && 'Aguardando Pagamento'}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {/* History button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistoryDialog(true)}
          >
            <History className="h-4 w-4 mr-2" />
            Histórico
          </Button>

          {/* Actions based on status */}
          {proposalData.status === 'pending' && (
            <>
              {isAwaitingMyAcceptance && (
                <Button
                  onClick={handleAcceptProposal}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Aceitar Proposta
                </Button>
              )}

              {!isAwaitingOtherAcceptance && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCounterDialog(true)}
                  className="flex-1"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  {isOwner ? 'Contra-Proposta' : 'Refazer Proposta'}
                </Button>
              )}

              {isAwaitingOtherAcceptance && (
                <div className="flex-1 text-center py-2 px-4 bg-yellow-500/10 text-yellow-600 rounded-md text-xs">
                  Aguardando resposta da outra parte
                </div>
              )}
            </>
          )}

          {/* Payment for accepted */}
          {proposalData.status === 'accepted' && 
           isOwner && 
           proposalData.payment_status !== 'captured' && (
            <Button
              onClick={() => setShowPaymentDialog(true)}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Efetuar Pagamento
            </Button>
          )}

          {/* Delete button */}
          {onDelete && proposalData.status === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              Excluir Conversa
            </Button>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ProposalPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        proposalId={proposalId}
        amount={currentAmount}
        projectTitle={proposalData.project?.title || 'Projeto'}
      />

      <ProposalCounterDialog
        open={showCounterDialog}
        onOpenChange={setShowCounterDialog}
        currentAmount={currentAmount}
        onSubmit={handleSendCounterProposal}
        isOwner={isOwner}
      />

      <ProposalHistoryDialog
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        proposalId={proposalId}
      />
    </>
  );
}