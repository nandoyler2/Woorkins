import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProjectBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('projectBannerDismissed') === 'true';
  });

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('projectBannerDismissed', 'true');
  };

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white p-6 rounded-lg mb-6">
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
          <h2 className="text-2xl font-bold mb-2">Encontre os melhores projetos!</h2>
          <p className="text-white/90 mb-4">
            Milhares de projetos disponíveis para você trabalhar e crescer profissionalmente.
          </p>
          <Button variant="secondary" className="bg-white text-purple-600 hover:bg-white/90">
            Criar meu perfil gratuitamente
          </Button>
        </div>
        <div className="hidden md:block">
          <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <span className="text-4xl">🚀</span>
          </div>
        </div>
      </div>
    </div>
  );
}
