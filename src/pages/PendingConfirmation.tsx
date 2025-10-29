import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, ArrowLeft, Edit } from 'lucide-react';
import logoWoorkins from '@/assets/logo-woorkins.png';
import { SafeImage } from '@/components/ui/safe-image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PendingConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email');
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    document.title = 'Confirme seu Email - Woorkins';
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResendEmail = async () => {
    if (!email || cooldown > 0) return;

    setResending(true);
    try {
      const { error } = await supabase.functions.invoke('resend-confirmation-email', {
        body: {
          email,
          site_url: window.location.origin,
        },
      });

      if (error) throw error;

      toast({
        title: '✅ Email reenviado',
        description: 'Enviamos um novo email de confirmação personalizado. Verifique sua caixa de entrada e spam.',
      });
      setCooldown(60);
    } catch (error: any) {
      const message = error?.message || 'Tente novamente em alguns segundos.';
      // Se vier um 429 do hook anterior por engano, mostramos mensagem amigável
      if (/request this after/i.test(message)) {
        const seconds = message.match(/\d+/)?.[0] || '60';
        setCooldown(parseInt(seconds));
        toast({
          variant: 'destructive',
          title: '⏱️ Aguarde um momento',
          description: `Por segurança, você poderá reenviar novamente em ${seconds} segundos.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao reenviar email',
          description: message,
        });
      }
    } finally {
      setResending(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !email) return;

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        variant: 'destructive',
        title: 'Email inválido',
        description: 'Por favor, insira um email válido.',
      });
      return;
    }

    setChangingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-unconfirmed-email', {
        body: {
          oldEmail: email,
          newEmail: newEmail,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: '✅ Email atualizado',
        description: 'Redirecionando para enviar nova confirmação...',
      });

      // Redirecionar com novo email
      setTimeout(() => {
        navigate(`/auth/pending-confirmation?email=${encodeURIComponent(newEmail)}`);
        setShowChangeEmail(false);
        setNewEmail('');
      }, 1500);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar email',
        description: error.message || 'Tente novamente mais tarde.',
      });
    } finally {
      setChangingEmail(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 relative">
      <Link to="/auth?mode=signin" className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span>Voltar ao Login</span>
      </Link>

      <Card className="w-full max-w-md shadow-elegant border-0">
        <CardHeader className="space-y-4 pb-8">
          <Link to="/" className="flex justify-center">
            <SafeImage src={logoWoorkins} alt="Logo Woorkins" className="h-16 w-auto" />
          </Link>
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-6">
              <Mail className="w-16 h-16 text-primary" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold">
              Confirme seu Email
            </CardTitle>
            <CardDescription className="text-base">
              Enviamos um link de confirmação para
            </CardDescription>
            {email && (
              <div className="flex items-center justify-center gap-2">
                <p className="text-lg font-semibold text-foreground">
                  {email}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChangeEmail(true)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Clique no link que enviamos para confirmar sua conta e começar a usar o Woorkins.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-foreground">💡 Dica:</p>
              <p className="text-xs text-muted-foreground">
                Se não encontrar o email, verifique sua pasta de <strong>spam</strong> ou <strong>lixo eletrônico</strong>.
              </p>
            </div>
          </div>

          <Button
            onClick={handleResendEmail}
            variant="outline"
            className="w-full h-11"
            disabled={resending || !email || cooldown > 0}
          >
            {resending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reenviando...
              </>
            ) : cooldown > 0 ? (
              `Aguarde ${cooldown}s para reenviar`
            ) : (
              'Reenviar Email de Confirmação'
            )}
          </Button>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Problemas para confirmar?{' '}
              <Link to="/" className="text-primary hover:underline">
                Entre em contato
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showChangeEmail} onOpenChange={setShowChangeEmail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Email</DialogTitle>
            <DialogDescription>
              Digite o novo endereço de email. Um novo link de confirmação será enviado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-email">Email atual</Label>
              <Input
                id="current-email"
                value={email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-email">Novo email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="seu@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={changingEmail}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowChangeEmail(false);
                setNewEmail('');
              }}
              disabled={changingEmail}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangeEmail}
              disabled={changingEmail || !newEmail}
            >
              {changingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                'Confirmar Alteração'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
