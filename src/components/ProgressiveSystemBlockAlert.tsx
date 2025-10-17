import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clock, Ban } from 'lucide-react';

interface ProgressiveSystemBlockAlertProps {
  blockedUntil: Date;
  reason: string;
  violationCount?: number;
  blockDurationHours?: number;
}

export function ProgressiveSystemBlockAlert({ 
  blockedUntil, 
  reason, 
  violationCount = 0,
  blockDurationHours = 0 
}: ProgressiveSystemBlockAlertProps) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const diff = blockedUntil.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('0 segundos');
        setIsExpired(true);
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

  if (isExpired) {
    return null;
  }

  const getSeverityColor = () => {
    if (blockDurationHours >= 168) return 'bg-red-950 border-red-500'; // 7 dias
    if (blockDurationHours >= 24) return 'bg-orange-950 border-orange-500'; // 1 dia
    if (blockDurationHours >= 6) return 'bg-yellow-950 border-yellow-500'; // 6 horas
    return 'bg-amber-950 border-amber-500'; // 1 hora
  };

  const getSeverityIcon = () => {
    if (blockDurationHours >= 24) return <Ban className="h-6 w-6" />;
    return <AlertTriangle className="h-6 w-6" />;
  };

  const getWarningLevel = () => {
    if (blockDurationHours >= 168) return 'BLOQUEIO SEVERO';
    if (blockDurationHours >= 24) return 'BLOQUEIO GRAVE';
    if (blockDurationHours >= 6) return 'BLOQUEIO MODERADO';
    return 'BLOQUEIO TEMPORÁRIO';
  };

  return (
    <Alert className={`${getSeverityColor()} border-2`}>
      <div className="flex items-start gap-4">
        <div className="mt-1">
          {getSeverityIcon()}
        </div>
        <div className="flex-1 space-y-3">
          <AlertTitle className="text-xl font-bold flex items-center gap-2">
            🚫 {getWarningLevel()}
          </AlertTitle>
          
          <AlertDescription className="space-y-3">
            <div className="text-base font-semibold">
              Sua conta foi bloqueada temporariamente devido a múltiplas violações graves.
            </div>

            <div className="bg-black/30 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" />
                <span className="font-bold text-lg">Tempo restante: {timeRemaining}</span>
              </div>
              <div className="text-sm opacity-80">
                Duração do bloqueio: {blockDurationHours}h
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold">📋 Motivo do bloqueio:</div>
              <div className="bg-black/20 p-3 rounded text-sm">
                {reason}
              </div>
            </div>

            {violationCount > 0 && (
              <div className="bg-red-900/30 p-3 rounded-lg border border-red-500/30">
                <div className="font-semibold mb-1">
                  ⚠️ Violações hoje: {violationCount}
                </div>
                <div className="text-xs opacity-90">
                  Cada nova violação aumentará significativamente o tempo de bloqueio.
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2 text-sm">
              <div className="font-semibold">💡 Escala de bloqueios progressivos:</div>
              <ul className="list-disc list-inside space-y-1 ml-2 opacity-90">
                <li>1ª violação grave: Aviso</li>
                <li>2ª violação (mesmo dia): 1 hora de bloqueio</li>
                <li>3ª violação (mesmo dia): 6 horas de bloqueio</li>
                <li>4ª violação (mesmo dia): 24 horas de bloqueio</li>
                <li>5+ violações (mesmo dia): 7 dias de bloqueio</li>
              </ul>
            </div>

            <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
              <div className="font-semibold mb-2">📌 Para evitar bloqueios futuros:</div>
              <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                <li>Mantenha sempre um comportamento respeitoso</li>
                <li>Evite linguagem ofensiva ou agressiva</li>
                <li>Não compartilhe conteúdo inadequado</li>
                <li>Respeite todos os usuários da plataforma</li>
                <li>Evite enviar mensagens que não têm a ver com as funcionalidades do Woorkins</li>
              </ul>
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}