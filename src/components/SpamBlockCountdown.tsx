import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface SpamBlockCountdownProps {
  remainingSeconds: number;
  reason?: string;
}

export function SpamBlockCountdown({ remainingSeconds, reason }: SpamBlockCountdownProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Aguarde para continuar</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="font-medium">
          Tempo restante: {minutes}:{seconds.toString().padStart(2, '0')}
        </p>
        <p className="text-sm">
          {reason || 'Por favor, aguarde alguns minutos antes de enviar mais mensagens.'}
        </p>
        <div className="text-xs mt-2 space-y-1">
          <p>💡 <strong>Dicas enquanto aguarda:</strong></p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Evite enviar mensagens muito rápidas</li>
            <li>Mantenha o respeito na comunicação</li>
            <li>Seja claro e objetivo nas mensagens</li>
            <li>Evite enviar mensagens que não têm a ver com as funcionalidades do Woorkins</li>
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
}
