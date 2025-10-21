import { useState } from "react";
import coinImage from "@/assets/woorkoins-coin.png";
import coinSound from "@/assets/coin-sound.mp3";

interface Coin {
  id: string;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
}

export function CoinRain() {
  const [coins, setCoins] = useState<Coin[]>([]);

  const playCoinSound = () => {
    const audio = new Audio(coinSound);
    audio.volume = 0.3; // Volume reduzido para ficar leve
    audio.play().catch(err => console.log('Audio play failed:', err));
  };

  const triggerCoinRain = () => {
    playCoinSound();
    
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
    ),
  };
}
