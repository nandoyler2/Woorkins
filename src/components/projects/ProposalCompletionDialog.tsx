import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle } from 'lucide-react';

interface ProposalCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  isFreelancer: boolean;
  onSuccess: () => void;
}

export function ProposalCompletionDialog({
  open,
  onOpenChange,
  proposalId,
  isFreelancer,
  onSuccess,
}: ProposalCompletionDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    try {
      setLoading(true);

      if (isFreelancer) {
        // Freelancer marcando como concluído
        const { error } = await supabase
          .from('proposals')
          .update({
            work_status: 'freelancer_completed',
            freelancer_completed_at: new Date().toISOString(),
          })
          .eq('id', proposalId);

        if (error) throw error;

        // Criar entrada no histórico
        const { data: proposal } = await supabase
          .from('proposals')
          .select('freelancer_id')
          .eq('id', proposalId)
          .single();

        if (proposal) {
          await supabase.from('proposal_status_history').insert({
            proposal_id: proposalId,
            status_type: 'freelancer_completed',
            changed_by: proposal.freelancer_id,
            message: 'Freelancer marcou o projeto como concluído',
          });
        }

        toast({
          title: 'Serviço marcado como finalizado',
          description: 'Aguarde a confirmação do cliente para liberar o pagamento.',
        });
      } else {
        // Cliente confirmando conclusão - liberar pagamento
        const { error } = await supabase.functions.invoke('release-proposal-payment', {
          body: { proposal_id: proposalId, action: 'approve' },
        });

        if (error) throw error;

        toast({
          title: 'Projeto concluído!',
          description: 'O pagamento foi liberado para o freelancer.',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao confirmar conclusão:', error);
      toast({
        title: 'Erro ao processar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {isFreelancer ? 'Marcar como Finalizado' : 'Confirmar Conclusão'}
          </DialogTitle>
          <DialogDescription>
            {isFreelancer ? (
              <div className="space-y-2 text-left">
                <p>Você está prestes a marcar este serviço como finalizado.</p>
                <p className="font-medium">O que acontece a seguir:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>O cliente será notificado</li>
                  <li>O cliente precisará confirmar a entrega</li>
                  <li>Após confirmação, o pagamento será liberado</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-2 text-left">
                <p>Você confirma que recebeu todo o trabalho conforme acordado?</p>
                <p className="font-medium text-destructive">⚠️ Atenção:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Esta ação não pode ser desfeita</li>
                  <li>O valor será liberado ao freelancer imediatamente</li>
                  <li>Certifique-se de ter recebido tudo antes de confirmar</li>
                </ul>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}