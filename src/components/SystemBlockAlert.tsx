import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Ban, Clock } from 'lucide-react';

interface SystemBlockAlertProps {
  blockType: 'messaging' | 'system';
  reason: string;
  blockedUntil?: Date | null;
  isPermanent: boolean;
}

export function SystemBlockAlert({ blockType, reason, blockedUntil, isPermanent }: SystemBlockAlertProps) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (isPermanent || !blockedUntil) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = blockedUntil.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('expirado');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let timeStr = '';
      if (days > 0) timeStr += `${days}d `;
      if (hours > 0) timeStr += `${hours}h `;
      if (minutes > 0) timeStr += `${minutes}m `;
      if (seconds > 0 || timeStr === '') timeStr += `${seconds}s`;

      setTimeRemaining(timeStr.trim());
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [blockedUntil, isPermanent]);

  const blockTypeText = blockType === 'messaging' ? 'enviar mensagens' : 'usar o sistema';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4">
      <Alert variant="destructive" className="max-w-md border-destructive/50">
        <div className="flex items-start gap-3">
          <Ban className="h-6 w-6 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <AlertDescription className="font-semibold text-lg">
              🚫 Você está bloqueado de {blockTypeText}
            </AlertDescription>
            <AlertDescription className="text-sm">
              <strong>Motivo:</strong> {reason}
            </AlertDescription>
            {isPermanent ? (
              <AlertDescription className="font-bold text-base pt-2 border-t border-destructive/20">
                ⏰ Bloqueio: PERMANENTE
              </AlertDescription>
            ) : blockedUntil && (
              <div className="flex items-center gap-2 pt-2 border-t border-destructive/20">
                <Clock className="h-4 w-4" />
                <AlertDescription className="font-mono font-bold text-base">
                  Tempo restante: {timeRemaining}
                </AlertDescription>
              </div>
            )}
            <AlertDescription className="text-xs text-muted-foreground pt-2">
              💡 Entre em contato com o suporte se acredita que isso é um erro.
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  );
}
