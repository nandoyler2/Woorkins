import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, CheckCircle } from 'lucide-react';
import { maskPixKey } from '@/lib/utils';

interface ConfirmPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawal: {
    id: string;
    profile_id: string;
    amount: number;
    pix_key: string;
    pix_key_type: string;
    profiles: {
      full_name: string;
      cpf: string;
      user_id: string;
    };
  };
  onConfirmed: () => void;
}

export function ConfirmPaymentDialog({
  open,
  onOpenChange,
  withdrawal,
  onConfirmed,
}: ConfirmPaymentDialogProps) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [withReceipt, setWithReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [manualConfirm, setManualConfirm] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleConfirm = async () => {
    if (!manualConfirm && !receiptFile) {
      toast({
        title: 'Confirmação necessária',
        description: 'Você precisa marcar a confirmação ou enviar um comprovante.',
        variant: 'destructive',
      });
      return;
    }

    setConfirming(true);

    try {
      let receiptUrl = null;

      // Upload do comprovante se fornecido
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${withdrawal.id}-${Date.now()}.${fileExt}`;
        const filePath = `withdrawal-receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('support-attachments')
          .upload(filePath, receiptFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('support-attachments')
          .getPublicUrl(filePath);

        receiptUrl = publicUrl;
      }

      // Processar saque via edge function
      const { data, error: functionError } = await supabase.functions.invoke(
        'admin-process-withdrawal',
        {
          body: {
            withdrawal_id: withdrawal.id,
            receipt_url: receiptUrl,
            admin_notes: adminNotes || null,
          },
        }
      );

      if (functionError) throw functionError;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao processar saque');
      }

      toast({
        title: 'Pagamento confirmado!',
        description: `O saque de R$ ${withdrawal.amount.toFixed(2)} foi processado com sucesso.`,
      });

      onConfirmed();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      toast({
        title: 'Erro ao confirmar pagamento',
        description: error.message || 'Não foi possível processar o pagamento.',
        variant: 'destructive',
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirmar Pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Usuário:</span>
              <span className="font-medium">{withdrawal.profiles.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">CPF:</span>
              <span className="font-medium">{withdrawal.profiles.cpf}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Chave PIX:</span>
              <span className="font-medium">
                {withdrawal.pix_key_type.toUpperCase()}: {maskPixKey(withdrawal.pix_key, withdrawal.pix_key_type)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-semibold">Valor:</span>
              <span className="text-2xl font-bold text-primary">
                R$ {withdrawal.amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Opção: Confirmar sem comprovante */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="manual-confirm"
              checked={manualConfirm}
              onCheckedChange={(checked) => setManualConfirm(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="manual-confirm"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Confirmo que o pagamento foi realizado manualmente
              </label>
              <p className="text-sm text-muted-foreground">
                Marque esta opção se você já realizou o PIX mas não tem o comprovante no momento
              </p>
            </div>
          </div>

          {/* Ou enviar comprovante */}
          <div className="space-y-2">
            <Label>Ou envie o comprovante do PIX (Opcional)</Label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="flex-1"
              />
              {receiptFile && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">{receiptFile.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações (Opcional)</Label>
            <Textarea
              placeholder="Digite observações sobre o pagamento..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={confirming} className="bg-green-600 hover:bg-green-700">
            {confirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar Pagamento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
