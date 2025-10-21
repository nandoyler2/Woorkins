import { useState, useRef } from "react";
import coinImage from "@/assets/woorkoins-coin.png";
import coinSound from "@/assets/coin-sound.mp3";
import thunderSound from "@/assets/thunder-sound.mp3";

interface Coin {
  id: string;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
}

export function CoinRain() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [showThunder, setShowThunder] = useState(false);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const playCoinSound = () => {
    const audio = new Audio(coinSound);
    audio.volume = 0.3; // Volume reduzido para ficar leve
    audio.play().catch(err => console.log('Audio play failed:', err));
  };

  const playThunderSound = () => {
    const audio = new Audio(thunderSound);
    audio.volume = 0.4;
    audio.play().catch(err => console.log('Thunder play failed:', err));
  };

  const triggerThunderEffect = () => {
    setShowThunder(true);
    playThunderSound();
    
    // Efeito de piscar relâmpagos por 3 segundos
    setTimeout(() => {
      setShowThunder(false);
    }, 3000);
  };

  const triggerCoinRain = () => {
    playCoinSound();
    
    // Gerenciar contagem de cliques consecutivos
    clickCountRef.current += 1;
    
    // Resetar o timer de cliques
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    
    // Se não clicar em 2 segundos, reseta a contagem
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 2000);
    
    // Se atingir 20 cliques, dispara o efeito especial
    if (clickCountRef.current >= 20) {
      triggerThunderEffect();
      clickCountRef.current = 0;
    }
    
    const newCoins: Coin[] = [];
    const timestamp = Date.now();
    for (let i = 0; i < 30; i++) {
      const delay = Math.random() * 0.4;
      const duration = 3 + Math.random() * 2; // 3-5 seconds
      const coinId = `${timestamp}-${i}-${Math.random()}`;

      newCoins.push({
        id: coinId,
        left: Math.random() * 95 + 2.5, // 2.5% to 97.5% to avoid edges
        delay,
        duration,
        rotation: Math.random() * 360,
      });

      // Remove each coin after its full animation completes (delay + duration)
      setTimeout(() => {
        setCoins((prev) => prev.filter((c) => c.id !== coinId));
      }, (delay + duration + 0.2) * 1000);
    }

    setCoins((prev) => [...prev, ...newCoins]);
  };

  return {
    triggerCoinRain,
    component: (
      <>
        {/* Thunder Effect */}
        {showThunder && (
          <div className="fixed inset-0 pointer-events-none z-50 animate-thunder">
            <div className="absolute inset-0 bg-yellow-300/30"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-yellow-400 animate-pulse-slow">
                <svg className="w-64 h-64" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
                </svg>
              </div>
            </div>
          </div>
        )}
        
        {/* Coin Rain */}
        <div className="fixed inset-0 pointer-events-none z-50">
          {coins.map((coin) => (
            <div
              key={coin.id}
              className="absolute animate-coin-fall"
              style={{
                left: `${coin.left}%`,
                top: "-50px",
                animationDelay: `${coin.delay}s`,
                animationDuration: `${coin.duration}s`,
                transform: `rotate(${coin.rotation}deg)`,
              }}
            >
              <img
                src={coinImage}
                alt="Moeda Woorkoins"
                className="w-12 h-12 animate-spin-slow"
              />
            </div>
          ))}
        </div>
      </>
    ),
  };
}
