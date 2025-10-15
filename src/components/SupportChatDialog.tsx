import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SupportChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportChatDialog({ open, onOpenChange }: SupportChatDialogProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsSending(true);

    try {
      // Simular envio de mensagem ao suporte
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Mensagem enviada!',
        description: 'Nossa equipe irá responder em breve por email ou WhatsApp.',
      });

      setMessage('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erro ao enviar',
        description: 'Ocorreu um erro ao enviar sua mensagem. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Falar com o Suporte
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Como podemos ajudar?</strong>
            </p>
            <p className="text-sm text-blue-700 mt-2">
              Descreva seu problema com a verificação de documentos. Nossa equipe irá analisar e responder o mais breve possível.
            </p>
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Descreva o problema que você está enfrentando..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              💬 Você também pode nos contatar via:
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
              >
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = 'mailto:suporte@exemplo.com'}
              >
                Email
              </Button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendMessage}
              className="flex-1"
              disabled={isSending || !message.trim()}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Mensagem
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
