import { useState, useCallback, useRef } from 'react';
import { useToast } from './use-toast';

interface ActionTracker {
  count: number;
  firstActionTime: number;
  lastActionTime: number;
  warned: boolean;
}

const ACTION_WINDOW = 10000; // 10 segundos
const MAX_ACTIONS = 5; // máximo de ações em 10 segundos
const WARNING_THRESHOLD = 3; // avisar após 3 ações rápidas

export function useActionSpamDetection() {
  const { toast } = useToast();
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [blockLevel, setBlockLevel] = useState(0);
  const actionTracker = useRef<ActionTracker>({
    count: 0,
    firstActionTime: 0,
    lastActionTime: 0,
    warned: false
  });

  const blockDurations = [5 * 60 * 1000, 10 * 60 * 1000, 20 * 60 * 1000, 40 * 60 * 1000, 60 * 60 * 1000]; // 5, 10, 20, 40, 60 min

  const startBlockTimer = useCallback((duration: number) => {
    setIsBlocked(true);
    setRemainingTime(duration);

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1000) {
          clearInterval(interval);
          setIsBlocked(false);
          actionTracker.current = {
            count: 0,
            firstActionTime: 0,
            lastActionTime: 0,
            warned: false
          };
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
  }, []);

  const checkAction = useCallback((actionName: string = 'ação'): boolean => {
    if (isBlocked) {
      const minutes = Math.ceil(remainingTime / 60000);
      toast({
        title: "Aguarde um momento",
        description: `Você está temporariamente bloqueado. Tempo restante: ${minutes} minuto(s).`,
        variant: "destructive",
      });
      return false;
    }

    const now = Date.now();
    const tracker = actionTracker.current;

    // Reset se passou a janela de tempo
    if (now - tracker.firstActionTime > ACTION_WINDOW) {
      tracker.count = 1;
      tracker.firstActionTime = now;
      tracker.lastActionTime = now;
      tracker.warned = false;
      return true;
    }

    // Incrementar contador
    tracker.count++;
    tracker.lastActionTime = now;

    // Verificar se precisa avisar
    if (tracker.count === WARNING_THRESHOLD && !tracker.warned) {
      tracker.warned = true;
      toast({
        title: "⚠️ Atenção!",
        description: "Você está realizando ações muito rápido. Por favor, diminua o ritmo para evitar bloqueio temporário.",
        variant: "default",
      });
      return true;
    }

    // Verificar se excedeu o limite
    if (tracker.count >= MAX_ACTIONS) {
      const currentBlockLevel = blockLevel;
      const nextBlockLevel = Math.min(currentBlockLevel + 1, blockDurations.length - 1);
      setBlockLevel(nextBlockLevel);

      const blockDuration = blockDurations[currentBlockLevel];
      const minutes = Math.ceil(blockDuration / 60000);

      toast({
        title: "🚫 Bloqueio Temporário",
        description: `Você foi bloqueado temporariamente por ${minutes} minuto(s) devido a ações muito rápidas. Aguarde para continuar.`,
        variant: "destructive",
        duration: 10000,
      });

      startBlockTimer(blockDuration);
      
      // Reset tracker
      tracker.count = 0;
      tracker.firstActionTime = 0;
      tracker.lastActionTime = 0;
      tracker.warned = false;

      return false;
    }

    return true;
  }, [isBlocked, remainingTime, blockLevel, toast, startBlockTimer]);

  return {
    checkAction,
    isBlocked,
    remainingTime: Math.ceil(remainingTime / 1000), // em segundos
  };
}
