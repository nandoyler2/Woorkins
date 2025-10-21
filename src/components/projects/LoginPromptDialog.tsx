import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface LoginPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: () => void;
}

export function LoginPromptDialog({ open, onOpenChange, onLoginSuccess }: LoginPromptDialogProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    // Store callback for after login
    if (onLoginSuccess) {
      sessionStorage.setItem('postLoginAction', 'openProposal');
    }
    navigate('/auth');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Login Necessário</DialogTitle>
          <DialogDescription>
            Você precisa estar logado para fazer uma proposta em um projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">
          <Button onClick={handleLogin} className="w-full">
            Fazer Login
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
