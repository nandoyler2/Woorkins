import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProposalNegotiationPanelProps {
  proposalId: string;
  proposalData: {
    budget: number;
    delivery_days: number;
    message: string;
    status: string;
    is_unlocked: boolean;
    current_proposal_amount?: number;
    current_proposal_by?: string;
    awaiting_acceptance_from?: string;
  };
  isOwner: boolean;
  currentProfileId: string;
  freelancerId: string;
  onStatusChange: () => void;
}

export function ProposalNegotiationPanel({
  proposalId,
  proposalData,
  isOwner,
  currentProfileId,
  freelancerId,
  onStatusChange,
}: ProposalNegotiationPanelProps) {
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCounterDialog, setShowCounterDialog] = useState(false);
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

  const handleSendCounterProposal = async () => {
    if (!counterAmount || parseFloat(counterAmount) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Digite um valor válido',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const amount = parseFloat(counterAmount);
      const otherProfileId = isOwner ? freelancerId : currentProfileId;

      // Create counter proposal
      const { error: counterError } = await supabase
        .from('counter_proposals')
        .insert({
          proposal_id: proposalId,
          from_profile_id: currentProfileId,
          to_profile_id: otherProfileId,
          amount,
          message: counterMessage,
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

      setShowCounterDialog(false);
      setCounterAmount('');
      setCounterMessage('');
      onStatusChange();
    } catch (error: any) {
      console.error('Error sending counter proposal:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível enviar a contra-proposta',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentAmount = proposalData.current_proposal_amount || proposalData.budget;
  const isAwaitingMyAcceptance = proposalData.awaiting_acceptance_from === currentProfileId;
  const isAwaitingOtherAcceptance = proposalData.awaiting_acceptance_from && !isAwaitingMyAcceptance;

  return (
    <Card className="p-4 bg-primary/5 border-primary/20">
      <div className="space-y-4">
        {/* Current Proposal Amount */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Valor da Proposta</p>
            <p className="text-2xl font-bold text-primary">
              R$ {currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Prazo: {proposalData.delivery_days} dias
            </p>
          </div>
          
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
        </div>

        {/* Initial Proposal Message */}
        {proposalData.message && (
          <div className="bg-background/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground mb-1">Mensagem da Proposta:</p>
            <p className="text-sm">{proposalData.message}</p>
          </div>
        )}

        {/* Actions */}
        {proposalData.status === 'pending' && (
          <div className="flex gap-2 flex-wrap">
            {/* Owner can accept the initial proposal or any counter-proposal */}
            {isAwaitingMyAcceptance && (
              <>
                <Button
                  onClick={handleAcceptProposal}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Aceitar Proposta
                </Button>
              </>
            )}

            {/* Both can send counter proposals */}
            {!isAwaitingOtherAcceptance && (
              <Dialog open={showCounterDialog} onOpenChange={setShowCounterDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <DollarSign className="h-4 w-4 mr-2" />
                    {isOwner ? 'Fazer Contra-Proposta' : 'Refazer Proposta'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {isOwner ? 'Fazer Contra-Proposta' : 'Refazer Proposta'}
                    </DialogTitle>
                    <DialogDescription>
                      Envie um novo valor para esta proposta. A outra parte precisará aceitar.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Novo Valor (R$)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={counterAmount}
                        onChange={(e) => setCounterAmount(e.target.value)}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Mensagem (opcional)</label>
                      <Textarea
                        value={counterMessage}
                        onChange={(e) => setCounterMessage(e.target.value)}
                        placeholder="Explique o motivo da contra-proposta..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={handleSendCounterProposal}
                      disabled={isSubmitting || !counterAmount}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Enviar Contra-Proposta
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {isAwaitingOtherAcceptance && (
              <div className="flex-1 text-center py-2 px-4 bg-yellow-500/10 text-yellow-600 rounded-md text-sm">
                Aguardando a outra parte aceitar sua contra-proposta
              </div>
            )}
          </div>
        )}

        {/* Payment Button for Accepted Proposals */}
        {proposalData.status === 'accepted' && isOwner && (
          <Button className="w-full bg-primary hover:bg-primary/90" size="lg">
            <DollarSign className="h-5 w-5 mr-2" />
            Efetuar Pagamento - R$ {currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Button>
        )}
      </div>
    </Card>
  );
}