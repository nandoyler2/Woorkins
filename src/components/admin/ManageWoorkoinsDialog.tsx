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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Coins, Loader2 } from 'lucide-react';

interface ManageWoorkoinsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string;
    username: string;
  };
  onSuccess: () => void;
}

export function ManageWoorkoinsDialog({ open, onOpenChange, user, onSuccess }: ManageWoorkoinsDialogProps) {
  const [operation, setOperation] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!amount || parseInt(amount) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Digite um valor válido',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get current balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('woorkoins_balance')
        .select('balance')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (balanceError) throw balanceError;

      const currentBalance = balanceData?.balance || 0;
      const changeAmount = parseInt(amount);
      const newBalance = operation === 'add' 
        ? currentBalance + changeAmount 
        : Math.max(0, currentBalance - changeAmount);

      // Update balance
      const { error: updateError } = await supabase
        .from('woorkoins_balance')
        .upsert({
          profile_id: user.id,
          balance: newBalance,
        }, {
          onConflict: 'profile_id'
        });

      if (updateError) throw updateError;

      // Create transaction record
      await supabase.from('woorkoins_transactions').insert({
        profile_id: user.id,
        amount: operation === 'add' ? changeAmount : -changeAmount,
        type: operation === 'add' ? 'admin_credit' : 'admin_debit',
        description: `Ajuste manual pelo admin: ${operation === 'add' ? 'adicionado' : 'removido'} ${changeAmount} woorkoins`,
      });

      toast({
        title: 'Woorkoins atualizados',
        description: `${operation === 'add' ? 'Adicionado' : 'Removido'} ${changeAmount} woorkoins ${operation === 'add' ? 'para' : 'de'} ${user.full_name}`,
      });

      onSuccess();
      onOpenChange(false);
      setAmount('');
      setOperation('add');
    } catch (error: any) {
      console.error('Error updating woorkoins:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar os woorkoins',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Gerenciar Woorkoins
          </DialogTitle>
          <DialogDescription>
            Adicionar ou remover woorkoins de {user.full_name} (@{user.username})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Operação</Label>
            <RadioGroup value={operation} onValueChange={(v) => setOperation(v as 'add' | 'remove')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="add" id="add" />
                <Label htmlFor="add" className="cursor-pointer">Adicionar woorkoins</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="remove" id="remove" />
                <Label htmlFor="remove" className="cursor-pointer">Remover woorkoins</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Quantidade</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              placeholder="Digite a quantidade"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !amount}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
