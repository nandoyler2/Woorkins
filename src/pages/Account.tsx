import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, User, Mail, Lock, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Account() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    username: '',
    email: '',
    cpf: ''
  });
  const [newEmail, setNewEmail] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('full_name, username, cpf')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setProfile({
        full_name: data.full_name || '',
        username: data.username || '',
        email: user.email || '',
        cpf: data.cpf || ''
      });
      setNewEmail(user.email || '');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate CPF if being added for the first time
      let updateData: any = {
        full_name: profile.full_name,
        username: profile.username,
      };

      // If CPF is being set for the first time, validate and add it
      if (profile.cpf && !profile.cpf.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/)) {
        const cpfDigits = profile.cpf.replace(/\D/g, '');
        if (cpfDigits.length !== 11) {
          toast({
            title: 'CPF inválido',
            description: 'O CPF deve ter 11 dígitos',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        updateData.cpf = cpfDigits;
      }

      // Update profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user?.id);

      if (profileError) {
        if (profileError.message.includes('duplicate key') || profileError.message.includes('cpf')) {
          toast({
            title: 'CPF já cadastrado',
            description: 'Este CPF já está em uso por outra conta',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        } else {
          throw profileError;
        }
      }

      // Check if email changed
      if (newEmail !== profile.email && newEmail.trim() !== '') {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
          toast({
            title: 'Email inválido',
            description: 'Por favor, insira um email válido',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        // Update email using Supabase Auth (will send confirmation email)
        const { error: emailError } = await supabase.auth.updateUser({
          email: newEmail,
        });

        if (emailError) {
          throw emailError;
        }

        toast({
          title: 'Confirmação enviada!',
          description: 'Um email de confirmação foi enviado para o novo endereço. Por favor, confirme para concluir a alteração.',
        });
      } else {
        toast({
          title: 'Perfil atualizado!',
          description: 'Suas informações foram salvas com sucesso.',
        });
      }

      // Reload profile to get the updated CPF
      loadProfile();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Senhas não conferem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter no mínimo 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Senha atualizada!',
        description: 'Sua senha foi alterada com sucesso.',
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao alterar senha',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/painel">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-4xl font-bold">Minha Conta</h1>
              <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
            </div>
          </div>

          {/* Informações do Perfil */}
          <Card className="bg-card/50 backdrop-blur-sm border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>Atualize seus dados pessoais</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome de Usuário</Label>
                  <Input
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    placeholder="seu_username"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="seu@email.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    {newEmail !== profile.email 
                      ? '⚠️ Um email de confirmação será enviado para o novo endereço'
                      : 'Email atual da conta'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    type="text"
                    value={profile.cpf ? profile.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : ''}
                    onChange={(e) => {
                      if (!profile.cpf) {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 11) {
                          setProfile({ ...profile, cpf: value });
                        }
                      }
                    }}
                    disabled={!!profile.cpf}
                    className={profile.cpf ? 'bg-muted' : ''}
                    placeholder="000.000.000-00"
                  />
                  <p className="text-xs text-muted-foreground">
                    {profile.cpf 
                      ? 'O CPF não pode ser alterado após definido'
                      : 'Obrigatório para realizar pagamentos'}
                  </p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all" 
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Alterar Senha */}
          <Card className="bg-card/50 backdrop-blur-sm border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>Mantenha sua conta segura</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Digite sua nova senha"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirme sua nova senha"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !passwordData.newPassword || !passwordData.confirmPassword}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {loading ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
