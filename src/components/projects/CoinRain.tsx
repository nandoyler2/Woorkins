import { useState } from "react";
import coinImage from "@/assets/woorkoins-coin.png";

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
    // Create more realistic coin sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create multiple oscillators for metallic sound
    const frequencies = [1200, 1600, 2000];
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Metallic coin sound with quick decay
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(freq * 0.5, audioContext.currentTime + 0.15);
      
      const volume = 0.15 / (index + 1);
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    });
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
