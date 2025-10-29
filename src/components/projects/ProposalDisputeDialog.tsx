import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ProposalDisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  freelancerId: string;
  ownerId: string;
  currentProfileId: string;
}

export function ProposalDisputeDialog({
  open,
  onOpenChange,
  proposalId,
  freelancerId,
  ownerId,
  currentProfileId,
}: ProposalDisputeDialogProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const reasonOptions = [
    { value: 'not_delivered', label: 'Não entregou' },
    { value: 'incomplete_delivery', label: 'Entrega incompleta' },
    { value: 'poor_quality', label: 'Má qualidade' },
    { value: 'lack_communication', label: 'Falta de comunicação' },
    { value: 'agreement_violation', label: 'Violação de acordo' },
    { value: 'other', label: 'Outro' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason || !description.trim()) {
      toast({
        title: 'Preencha todos os campos',
        description: 'Motivo e descrição são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const againstProfileId = currentProfileId === freelancerId ? ownerId : freelancerId;

      const { error } = await supabase
        .from('project_disputes')
        .insert({
          proposal_id: proposalId,
          opened_by: currentProfileId,
          against_profile_id: againstProfileId,
          reason,
          description,
          status: 'open',
        });

      if (error) throw error;

      // Atualizar status da proposta
      await supabase
        .from('proposals')
        .update({ work_status: 'disputed' })
        .eq('id', proposalId);

      toast({
        title: 'Disputa aberta',
        description: 'Um administrador irá analisar o caso em breve.',
      });

      onOpenChange(false);
      setReason('');
      setDescription('');
    } catch (error: any) {
      console.error('Erro ao abrir disputa:', error);
      toast({
        title: 'Erro ao abrir disputa',
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
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Abrir Reclamação
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">⚠️ Importante:</p>
            <p className="text-muted-foreground">
              Ao abrir uma disputa, um administrador irá analisar o caso e tomar uma decisão.
              O pagamento ficará retido até a resolução.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição detalhada *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva em detalhes o problema..."
              rows={5}
              required
            />
            <p className="text-xs text-muted-foreground">
              Seja específico e forneça todos os detalhes relevantes para ajudar na análise
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant="destructive"
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Abrindo...
                </>
              ) : (
                'Abrir Disputa'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}