import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import woorkoinsIcon from "@/assets/woorkoins-banner-icon.png";
import { CoinRain } from "./CoinRain";

export function ProjectBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('projectBannerDismissed') === 'true';
  });

  const { triggerCoinRain, component: coinRainComponent } = CoinRain();

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('projectBannerDismissed', 'true');
  };

  const handleBannerClick = (e: React.MouseEvent) => {
    // Não dispara se clicar no botão ou no X
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    triggerCoinRain();
  };

  if (dismissed) return null;

  return (
    <>
      {coinRainComponent}
      <div 
        className="relative bg-gradient-to-r from-[#1E88E5] via-[#26C6DA] to-[#00ACC1] text-white p-6 rounded-lg mb-6 cursor-pointer"
        onClick={handleBannerClick}
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
              Siga nosso Instagram e receba prêmios de Woorkoins todos os dias em nosso storie.
            </p>
            <Button 
              variant="secondary" 
              className="bg-white text-[#1E88E5] hover:bg-white/90 font-semibold"
              onClick={() => window.open('https://instagram.com/woorkinsbrasil', '_blank')}
            >
              Clique aqui e siga
            </Button>
          </div>
          <div className="hidden md:block">
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
