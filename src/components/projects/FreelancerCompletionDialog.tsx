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
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, AlertCircle } from 'lucide-react';

interface FreelancerCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function FreelancerCompletionDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: FreelancerCompletionDialogProps) {
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
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Marcar Projeto como Concluído
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-3 pt-2">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                📋 Como funciona:
              </p>
              <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
                <li>Será enviado pedido de confirmação ao cliente</li>
                <li>O cliente tem <strong>72 horas (3 dias)</strong> para confirmar</li>
                <li>Se não houver resposta, o projeto será <strong>automaticamente concluído</strong></li>
                <li>Após a conclusão, seu pagamento ficará <strong>imediatamente disponível</strong> para saque</li>
              </ol>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                    Atenção
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Marque como concluído apenas se você realmente finalizou todo o trabalho acordado.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                id="understood"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked === true)}
                className="mt-1"
              />
              <label
                htmlFor="understood"
                className="text-sm font-medium text-foreground cursor-pointer leading-tight"
              >
                Entendo que ao marcar como concluído, o cliente tem 72h para confirmar e após esse prazo o pagamento será automaticamente liberado
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
            {isLoading ? 'Processando...' : 'Confirmar Conclusão'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
