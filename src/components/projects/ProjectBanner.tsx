import { useState, useEffect } from "react";
import { X, Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import woorkoinsIcon from "@/assets/woorkoins-banner-icon.png";
import { CoinRain } from "./CoinRain";

type BannerType = 'woorkoins' | 'payment';

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export function ProjectBanner() {
  const [currentBanner, setCurrentBanner] = useState<BannerType | null>(() => {
    const lastDismissedWoorkoins = localStorage.getItem('projectBannerWoorkoinsDismissed');
    const lastDismissedPayment = localStorage.getItem('projectBannerPaymentDismissed');
    
    const now = Date.now();
    const canShowWoorkoins = !lastDismissedWoorkoins || (now - parseInt(lastDismissedWoorkoins)) > FIVE_DAYS_MS;
    const canShowPayment = !lastDismissedPayment || (now - parseInt(lastDismissedPayment)) > FIVE_DAYS_MS;
    
    // Alterna entre os banners baseado em qual foi mostrado por último
    const lastShown = localStorage.getItem('projectBannerLastShown');
    
    if (canShowWoorkoins && (!lastShown || lastShown === 'payment')) {
      return 'woorkoins';
    }
    if (canShowPayment && (!lastShown || lastShown === 'woorkoins')) {
      return 'payment';
    }
    if (canShowWoorkoins) return 'woorkoins';
    if (canShowPayment) return 'payment';
    
    return null;
  });

  const { triggerCoinRain, component: coinRainComponent } = CoinRain();

  useEffect(() => {
    if (currentBanner) {
      localStorage.setItem('projectBannerLastShown', currentBanner);
    }
  }, [currentBanner]);

  const handleDismiss = () => {
    const now = Date.now();
    if (currentBanner === 'woorkoins') {
      localStorage.setItem('projectBannerWoorkoinsDismissed', now.toString());
    } else {
      localStorage.setItem('projectBannerPaymentDismissed', now.toString());
    }
    setCurrentBanner(null);
  };

  if (!currentBanner) return null;

  if (currentBanner === 'woorkoins') {
    return (
      <>
        {coinRainComponent}
        <div 
          className="relative bg-gradient-to-r from-[#1E88E5] via-[#26C6DA] to-[#00ACC1] text-white p-6 rounded-lg mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white hover:bg-white/20"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center justify-between pr-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Ganhe Woorkoins diariamente!</h2>
              <p className="text-white/90 mb-4">
                Siga nosso Instagram e receba prêmios de Woorkoins todos os dias em nossos stories.
              </p>
              <Button 
                variant="secondary" 
                className="bg-white text-[#1E88E5] hover:bg-white/90 font-semibold"
                onClick={() => window.open('https://instagram.com/woorkinsbrasil', '_blank')}
              >
                Clique aqui e siga @woorkinsbrasil
              </Button>
            </div>
            <div 
              className="hidden md:block cursor-pointer hover:scale-105 transition-transform"
              onClick={triggerCoinRain}
              title="Clique para uma surpresa!"
            >
              <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm p-4">
                <img 
                  src={woorkoinsIcon} 
                  alt="Woorkoins" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Banner de pagamento
  return (
    <div 
      className="relative bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white p-6 rounded-lg mb-6"
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 text-white hover:bg-white/20"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center justify-between pr-8">
        <div>
          <h2 className="text-2xl font-bold mb-2">Saldo disponível?</h2>
          <p className="text-white/90 mb-4">
            Receba seu pagamento em até 24h após o trabalho concluído. Aproveite que a menor taxa de pagamento e pix mais rápido é só no Woorkins!
          </p>
          <Button 
            variant="secondary" 
            className="bg-white text-emerald-600 hover:bg-white/90 font-semibold"
            onClick={() => window.open('https://instagram.com/woorkinsbrasil', '_blank')}
          >
            Siga-nos no Instagram
          </Button>
        </div>
        <div className="hidden md:flex items-center justify-center">
          <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <div className="relative">
              <Wallet className="w-16 h-16" />
              <Zap className="w-8 h-8 absolute -top-2 -right-2 text-yellow-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
