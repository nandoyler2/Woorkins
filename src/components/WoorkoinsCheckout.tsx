import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import woorkoinsIcon from '@/assets/woorkoins-icon-final.png';

interface WoorkoinsCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkoutUrl: string;
  amount: number;
  price: number;
  onSuccess: () => void;
}

export function WoorkoinsCheckout({ 
  open, 
  onOpenChange, 
  checkoutUrl, 
  amount, 
  price,
  onSuccess 
}: WoorkoinsCheckoutProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (open && checkoutUrl) {
      // Redirecionar para o checkout do Stripe
      window.location.href = checkoutUrl;
      
      // Fechar o dialog
      onOpenChange(false);
    }
  }, [open, checkoutUrl, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={woorkoinsIcon} alt="Woorkoins" className="h-6 w-auto object-contain" />
            Comprar Woorkoins
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-center gap-3">
              <img src={woorkoinsIcon} alt="Woorkoins" className="h-12 w-auto object-contain" />
              <div>
                <p className="text-2xl font-bold">{amount} Woorkoins</p>
                <p className="text-sm text-muted-foreground">Total: R$ {price.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-sm">Redirecionando para o pagamento seguro...</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
