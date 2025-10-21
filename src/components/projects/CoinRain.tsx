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

    // Remove coins after animation completes (5 seconds max)
    const timer = setTimeout(() => {
      setCoins((prev) => prev.slice(30)); // Keep only recent coins to avoid memory issues
    }, 5000);

    return () => clearTimeout(timer);
  }, [coins]);

  const triggerCoinRain = () => {
    const newCoins: Coin[] = [];
    const timestamp = Date.now();
    for (let i = 0; i < 30; i++) {
      newCoins.push({
        id: timestamp + Math.random() * 10000 + i,
        left: Math.random() * 95 + 2.5, // 2.5% to 97.5% to avoid edges
        delay: Math.random() * 0.3,
        duration: 3 + Math.random() * 2, // 3-5 seconds
        rotation: Math.random() * 360,
      });
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
