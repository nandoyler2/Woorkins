import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Ban, Loader2 } from 'lucide-react';

interface BlockUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string;
    username: string;
  };
  currentUserProfileId: string;
  onSuccess: () => void;
}

export function BlockUserDialog({ open, onOpenChange, user, currentUserProfileId, onSuccess }: BlockUserDialogProps) {
  const [blockType, setBlockType] = useState<'messaging' | 'system'>('messaging');
  const [durationType, setDurationType] = useState<'hours' | 'days' | 'permanent'>('hours');
  const [duration, setDuration] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Digite o motivo do bloqueio',
      });
      return;
    }

    if (durationType !== 'permanent' && (!duration || parseInt(duration) <= 0)) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Digite uma duração válida',
      });
      return;
    }

    setIsLoading(true);
    try {
      let blockedUntil = null;
      const isPermanent = durationType === 'permanent';

      if (!isPermanent) {
        const durationNum = parseInt(duration);
        const multiplier = durationType === 'hours' ? 60 : 60 * 24; // minutes
        const durationMinutes = durationNum * multiplier;
        blockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
      }

      const { error } = await supabase
        .from('system_blocks')
        .upsert({
          profile_id: user.id,
          blocked_by: currentUserProfileId,
          block_type: blockType,
          reason: reason.trim(),
          blocked_until: blockedUntil,
          is_permanent: isPermanent,
        }, {
          onConflict: 'profile_id,block_type'
        });

      if (error) throw error;

      const blockTypeText = blockType === 'messaging' ? 'mensagens' : 'sistema';
      const durationText = isPermanent 
        ? 'permanentemente' 
        : `por ${duration} ${durationType === 'hours' ? 'hora(s)' : 'dia(s)'}`;

      toast({
        title: 'Usuário bloqueado',
        description: `${user.full_name} foi bloqueado de usar ${blockTypeText} ${durationText}`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error blocking user:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Não foi possível bloquear o usuário',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setBlockType('messaging');
    setDurationType('hours');
    setDuration('');
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Bloquear Usuário
          </DialogTitle>
          <DialogDescription>
            Bloquear {user.full_name} (@{user.username})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Bloqueio</Label>
            <RadioGroup value={blockType} onValueChange={(v) => setBlockType(v as 'messaging' | 'system')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="messaging" id="messaging" />
                <Label htmlFor="messaging" className="cursor-pointer">
                  Apenas Mensagens (usuário pode usar o restante do sistema)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system" className="cursor-pointer">
                  Sistema Completo (bloqueio total)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Duração do Bloqueio</Label>
            <RadioGroup value={durationType} onValueChange={(v) => setDurationType(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hours" id="hours" />
                <Label htmlFor="hours" className="cursor-pointer">Horas</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="days" id="days" />
                <Label htmlFor="days" className="cursor-pointer">Dias</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="permanent" id="permanent" />
                <Label htmlFor="permanent" className="cursor-pointer">Permanente</Label>
              </div>
            </RadioGroup>
          </div>

          {durationType !== 'permanent' && (
            <div className="space-y-2">
              <Label htmlFor="duration">
                Quantidade de {durationType === 'hours' ? 'horas' : 'dias'}
              </Label>
              <Input
                id="duration"
                type="number"
                min="1"
                placeholder={`Digite a quantidade de ${durationType === 'hours' ? 'horas' : 'dias'}`}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do Bloqueio*</Label>
            <Textarea
              id="reason"
              placeholder="Digite o motivo do bloqueio (será mostrado ao usuário)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit} 
            disabled={isLoading || !reason.trim()}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Bloquear Usuário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
