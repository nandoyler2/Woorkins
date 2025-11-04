import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import logoWoorkins from '@/assets/logo-woorkins.png';
import { SafeImage } from '@/components/ui/safe-image';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'signin'; // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signIn, signUp } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    document.title = mode === 'signin' ? 'Entrar - Woorkins' : 'Cadastrar - Woorkins';
  }, [mode]);

  useEffect(() => {
    if (user) {
      navigate('/painel');
    }
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Erro ao criar conta',
        description: 'As senhas não correspondem',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, fullName);

    if (error) {
      toast({
        title: 'Erro ao criar conta',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    } else {
      // Verificar se email foi auto-confirmado
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.email_confirmed_at) {
        // Email auto-confirmado, redirecionar direto para welcome
        toast({
          title: 'Conta criada!',
          description: 'Bem-vindo ao Woorkins!',
        });
        navigate('/welcome');
      } else {
        // Email precisa ser confirmado manualmente
        navigate(`/auth/pending-confirmation?email=${encodeURIComponent(email)}`);
      }
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      // Verificar se é erro de email não confirmado
      if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        toast({
          title: 'Email não confirmado',
          description: 'Por favor, confirme seu email antes de fazer login.',
          variant: 'destructive',
        });
        navigate(`/auth/pending-confirmation?email=${encodeURIComponent(email)}`);
      } else {
        toast({
          title: 'Erro ao fazer login',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      // Verificar se usuário confirmou email
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.email_confirmed_at) {
        await supabase.auth.signOut();
        toast({
          title: 'Email não confirmado',
          description: 'Por favor, confirme seu email antes de fazer login.',
          variant: 'destructive',
        });
        navigate(`/auth/pending-confirmation?email=${encodeURIComponent(email)}`);
      } else {
        navigate('/painel');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-glow to-secondary p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_var(--primary-glow)_0%,_transparent_50%)] opacity-30 animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_var(--secondary)_0%,_transparent_50%)] opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
      
      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 text-white/80 hover:text-white transition-all z-20 backdrop-blur-sm bg-white/10 px-4 py-2 rounded-full hover:bg-white/20">
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Voltar</span>
      </Link>
      
      <Card className="w-full max-w-md shadow-2xl border-0 bg-background/95 backdrop-blur-xl relative z-10">
        <CardHeader className="space-y-4 pb-8 pt-8">
          <Link to="/" className="flex justify-center mb-2">
            <SafeImage src={logoWoorkins} alt="Logo Woorkins" className="h-20 w-auto hover:scale-110 transition-transform drop-shadow-lg" />
          </Link>
          <div className="text-center space-y-3">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              {mode === 'signup' ? 'Criar Conta' : 'Entrar'}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {mode === 'signup' 
                ? 'Junte-se à comunidade Woorkins e comece sua jornada' 
                : 'Bem-vindo de volta! Continue de onde parou'}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="pb-8 px-8">
          {mode === 'signup' ? (
            <form onSubmit={handleSignUp} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signup-name">{t('full_name')}</Label>
                <Input
                  id="signup-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-11"
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">{t('email')}</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                  placeholder="seu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">{t('password')}</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">Confirmar Senha</Label>
                <Input
                  id="signup-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11"
                  placeholder="Repita sua senha"
                />
              </div>
              <Button type="submit" className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all mt-6 bg-gradient-to-r from-primary to-primary-glow" disabled={loading}>
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">ou</span>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link to="/auth?mode=signin" className="text-primary hover:text-primary-glow font-semibold transition-colors hover:underline">
                  Entrar agora
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signin-email">{t('email')}</Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                  placeholder="seu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">{t('password')}</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                  placeholder="Sua senha"
                />
              </div>
              <Button type="submit" className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all mt-6 bg-gradient-to-r from-primary to-primary-glow" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">ou</span>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <Link to="/auth?mode=signup" className="text-primary hover:text-primary-glow font-semibold transition-colors hover:underline">
                  Criar Conta agora
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
