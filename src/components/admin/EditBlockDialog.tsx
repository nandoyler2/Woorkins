import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, Ban } from 'lucide-react';

interface EditBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: any;
  onSuccess: () => void;
}

export function EditBlockDialog({
  open,
  onOpenChange,
  block,
  onSuccess,
}: EditBlockDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isPermanent, setIsPermanent] = useState(block?.is_permanent || false);
  const [durationType, setDurationType] = useState<'hours' | 'days'>('hours');
  const [durationValue, setDurationValue] = useState('');
  const [reason, setReason] = useState(block?.reason || '');
  const { toast } = useToast();

  useEffect(() => {
    if (block) {
      setIsPermanent(block.is_permanent);
      setReason(block.reason);
      
      // Calcular duração atual se não for permanente
      if (!block.is_permanent && block.blocked_until) {
        const now = new Date();
        const until = new Date(block.blocked_until);
        const diffMs = until.getTime() - now.getTime();
        const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
        
        if (diffHours > 24) {
          setDurationType('days');
          setDurationValue(Math.ceil(diffHours / 24).toString());
        } else {
          setDurationType('hours');
          setDurationValue(diffHours.toString());
        }
      }
    }
  }, [block]);

  const handleSubmit = async () => {
    if (!isPermanent && !durationValue) {
      toast({
        title: 'Erro',
        description: 'Informe a duração do bloqueio',
        variant: 'destructive',
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: 'Erro',
        description: 'Informe o motivo do bloqueio',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      let blockedUntil = null;
      if (!isPermanent) {
        const now = new Date();
        const duration = parseInt(durationValue);
        const hours = durationType === 'days' ? duration * 24 : duration;
        blockedUntil = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
      }

      const { error } = await supabase
        .from('system_blocks')
        .update({
          reason: reason.trim(),
          blocked_until: blockedUntil,
          is_permanent: isPermanent,
        })
        .eq('id', block.id);

      if (error) throw error;

      toast({
        title: 'Bloqueio atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating block:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o bloqueio.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-primary" />
            Editar Bloqueio
          </DialogTitle>
          <DialogDescription>
            Altere a duração e o motivo do bloqueio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bloqueio Permanente */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label>Bloqueio Permanente</Label>
              <p className="text-sm text-muted-foreground">
                O usuário ficará bloqueado indefinidamente
              </p>
            </div>
            <Switch
              checked={isPermanent}
              onCheckedChange={setIsPermanent}
            />
          </div>

          {/* Duração (apenas se não for permanente) */}
          {!isPermanent && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duração do Bloqueio
              </Label>
              <RadioGroup
                value={durationType}
                onValueChange={(value: 'hours' | 'days') => setDurationType(value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hours" id="hours" />
                  <Label htmlFor="hours">Horas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="days" id="days" />
                  <Label htmlFor="days">Dias</Label>
                </div>
              </RadioGroup>
              <Input
                type="number"
                min="1"
                placeholder={durationType === 'hours' ? 'Ex: 24' : 'Ex: 7'}
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {durationType === 'hours' 
                  ? 'Informe o número de horas (ex: 1, 6, 24, 168)' 
                  : 'Informe o número de dias (ex: 1, 7, 30)'}
              </p>
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do Bloqueio</Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo do bloqueio..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
