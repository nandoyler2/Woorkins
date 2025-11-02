import { useUpload } from '@/contexts/UploadContext';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export function UploadIndicator() {
  const { currentUpload } = useUpload();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Animar entrada
  useEffect(() => {
    if (currentUpload && !isDismissed) {
      setIsVisible(true);
    }
  }, [currentUpload, isDismissed]);

  // Celebração quando completar
  useEffect(() => {
    if (currentUpload?.status === 'success' && isVisible) {
      // Pode adicionar confetti ou outro efeito aqui
    }
  }, [currentUpload?.status, isVisible]);

  if (!currentUpload || isDismissed) return null;

  const handleDismiss = () => {
    if (currentUpload.status !== 'uploading') {
      setIsVisible(false);
      setTimeout(() => {
        setIsDismissed(true);
        setTimeout(() => setIsDismissed(false), 300);
      }, 300);
    }
  };

  return (
    <div 
      className={`fixed bottom-6 right-6 z-[100] transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="bg-background/95 backdrop-blur-xl border-2 rounded-2xl shadow-2xl p-5 min-w-[360px] max-w-md ring-4 ring-primary/10">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            {currentUpload.status === 'uploading' && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full blur-md opacity-75 animate-pulse" />
                <div className="relative w-12 h-12 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              </div>
            )}
            {currentUpload.status === 'success' && (
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 rounded-full blur-md opacity-50" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-pulse" />
              </div>
            )}
            {currentUpload.status === 'error' && (
              <div className="relative">
                <div className="absolute inset-0 bg-destructive rounded-full blur-md opacity-50" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-1">
            <p className={`text-base font-bold mb-2 ${
              currentUpload.status === 'error' 
                ? 'text-destructive' 
                : 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent'
            }`}>
              {currentUpload.status === 'error' ? 'Story não publicado' : currentUpload.message}
            </p>
            
            {currentUpload.status === 'uploading' && (
              <div className="space-y-2">
                <div className="relative">
                  <Progress value={currentUpload.progress} className="h-2.5" />
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full transition-all duration-300 shadow-lg shadow-purple-500/50"
                    style={{ width: `${currentUpload.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-primary">{currentUpload.progress}%</p>
                  <p className="text-xs text-muted-foreground">
                    Você pode navegar normalmente
                  </p>
                </div>
              </div>
            )}

            {currentUpload.status === 'success' && (
              <p className="text-sm text-muted-foreground">
                Story publicado! ✨
              </p>
            )}

            {currentUpload.status === 'error' && (
              <p className="text-sm text-destructive/90 font-medium leading-relaxed">
                {currentUpload.message}
              </p>
            )}
          </div>

          {/* Close button */}
          {currentUpload.status !== 'uploading' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 hover:bg-muted"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
