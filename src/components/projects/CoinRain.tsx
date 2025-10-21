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

  useEffect(() => {
    if (coins.length === 0) return;

    const timer = setTimeout(() => {
      setCoins([]);
    }, 3000);

    return () => clearTimeout(timer);
  }, [coins]);

  const triggerCoinRain = () => {
    const newCoins: Coin[] = [];
    for (let i = 0; i < 20; i++) {
      newCoins.push({
        id: Date.now() + i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 1,
        rotation: Math.random() * 360,
      });
    }
    setCoins(newCoins);
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
