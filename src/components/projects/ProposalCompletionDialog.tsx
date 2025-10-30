import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, CheckCircle2, Coins } from 'lucide-react';

interface ProposalCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  freelancerAmount: number;
  freelancerName: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ProposalCompletionDialog({
  open,
  onOpenChange,
  freelancerAmount,
  freelancerName,
  onConfirm,
  isLoading = false,
}: ProposalCompletionDialogProps) {
  const [understood, setUnderstood] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setUnderstood(false);
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = () => {
    setUnderstood(false);
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl">
                Confirmar Conclusão do Trabalho
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="space-y-4 pt-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-semibold mb-1">O trabalho foi concluído?</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    Ao confirmar, o valor será liberado para <span className="font-semibold">{freelancerName}</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Coins className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-green-900 dark:text-green-100 mb-2">
                    Valor a ser liberado:
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    R$ {freelancerAmount.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-amber-900 dark:text-amber-100">
                  <p className="font-semibold mb-1">⚠️ Atenção - Ação Irreversível</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
                    <li>O valor será creditado na carteira do freelancer</li>
                    <li>Não será possível desfazer esta ação</li>
                    <li>Certifique-se de que o trabalho foi concluído corretamente</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                id="understood"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked === true)}
                disabled={isLoading}
              />
              <label
                htmlFor="understood"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Confirmo que o trabalho foi concluído e entendo que esta ação é irreversível
              </label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!understood || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Processando...' : 'Confirmar e Liberar Pagamento'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
