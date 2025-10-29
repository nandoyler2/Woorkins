import { useUpload } from '@/contexts/UploadContext';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function UploadIndicator() {
  const { currentUpload } = useUpload();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!currentUpload || isDismissed) return null;

  const handleDismiss = () => {
    if (currentUpload.status !== 'uploading') {
      setIsDismissed(true);
      // Reset dismissed state after animation
      setTimeout(() => setIsDismissed(false), 300);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-background border rounded-xl shadow-2xl p-4 min-w-[320px] max-w-md">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {currentUpload.status === 'uploading' && (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            )}
            {currentUpload.status === 'success' && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            {currentUpload.status === 'error' && (
              <XCircle className="w-5 h-5 text-destructive" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-1">{currentUpload.message}</p>
            
            {currentUpload.status === 'uploading' && (
              <div className="space-y-1">
                <Progress value={currentUpload.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{currentUpload.progress}%</p>
              </div>
            )}

            {currentUpload.status === 'uploading' && (
              <p className="text-xs text-muted-foreground mt-2">
                Você pode navegar no site normalmente
              </p>
            )}
          </div>

          {/* Close button (apenas se não estiver fazendo upload) */}
          {currentUpload.status !== 'uploading' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
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
