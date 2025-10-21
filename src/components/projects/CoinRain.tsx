import { useEffect, useState } from "react";
import coinImage from "@/assets/woorkoins-coin.png";

interface Coin {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
}

export function CoinRain() {
  const [coins, setCoins] = useState<Coin[]>([]);

  const triggerCoinRain = () => {
    const newCoins: Coin[] = [];
    const timestamp = Date.now();
    for (let i = 0; i < 30; i++) {
      const duration = 3 + Math.random() * 2; // 3-5 seconds
      const coinId = timestamp + Math.random() * 10000 + i;
      
      newCoins.push({
        id: coinId,
        left: Math.random() * 95 + 2.5, // 2.5% to 97.5% to avoid edges
        delay: Math.random() * 0.3,
        duration: duration,
        rotation: Math.random() * 360,
      });

      // Remove each coin after its animation completes
      setTimeout(() => {
        setCoins((prev) => prev.filter((c) => c.id !== coinId));
      }, (duration + 0.5) * 1000);
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
              alt="Woorkoin"
              className="w-12 h-12 animate-spin-slow"
            />
          </div>
        ))}
      </div>
    ),
  };
}
