import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Clock } from 'lucide-react';

interface BlockedMessageCountdownProps {
  blockedUntil: Date;
  reason: string;
}

export function BlockedMessageCountdown({ blockedUntil, reason }: BlockedMessageCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const diff = blockedUntil.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('0 segundos');
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
  }, [blockedUntil]);

  return (
    <Alert variant="destructive" className="border-destructive/50">
      <div className="flex items-start gap-3">
        <Lock className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <AlertDescription className="font-semibold text-base">
            🚫 Você está bloqueado de enviar mensagens
          </AlertDescription>
          <AlertDescription className="text-sm">
            {reason}
          </AlertDescription>
          <div className="flex items-center gap-2 pt-2 border-t border-destructive/20">
            <Clock className="h-4 w-4" />
            <AlertDescription className="font-mono font-bold text-base">
              Tempo restante: {timeRemaining}
            </AlertDescription>
          </div>
          <AlertDescription className="text-xs text-muted-foreground">
            💡 Dica: Use sempre o chat da plataforma para negociar. Nunca compartilhe informações de contato pessoal.
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
