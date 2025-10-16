import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock } from "lucide-react";

interface ActionSpamBlockAlertProps {
  remainingTime: number; // em segundos
}

export function ActionSpamBlockAlert({ remainingTime }: ActionSpamBlockAlertProps) {
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;

  return (
    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
      <Clock className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-900 dark:text-orange-100">
        Bloqueio Temporário Ativo
      </AlertTitle>
      <AlertDescription className="text-orange-800 dark:text-orange-200 space-y-2">
        <p className="font-medium">
          Tempo restante: {minutes}:{seconds.toString().padStart(2, '0')}
        </p>
        <p className="text-sm">
          Você foi temporariamente bloqueado por realizar ações muito rápidas.
        </p>
        <div className="text-xs mt-2 space-y-1">
          <p className="font-semibold">💡 Evite bloqueios futuros:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Aguarde alguns segundos entre ações</li>
            <li>Não atualize a página rapidamente</li>
            <li>Faça ações com calma e atenção</li>
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
}
