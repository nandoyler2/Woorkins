import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, User, Mail, Lock, Shield, Camera, LockKeyhole, ExternalLink, Trash2, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { validateCPF, formatFullName, formatShortName } from '@/lib/utils';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Lista de usernames reservados do sistema
const RESERVED_USERNAMES = [
  'admin', 'root', 'woorkins', 'api', 'app', 'web', 'www', 'supabase', 
  'auth', 'login', 'signup', 'dashboard', 'painel', 'perfil', 'profile',
  'conta', 'account', 'configuracoes', 'settings', 'projetos', 'projects',
  'mensagens', 'messages', 'notificacoes', 'notifications', 'buscar', 'search',
  'ajuda', 'help', 'suporte', 'support', 'sobre', 'about', 'contato', 'contact',
  'termos', 'terms', 'privacidade', 'privacy', 'feed', 'admin', 'moderador',
  'moderator', 'sistema', 'system', 'equipe', 'team', 'blog', 'noticias', 'news',
  'pagamento', 'payment', 'checkout', 'success', 'error', 'financeiro', 'finances'
];

export default function Account() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { openWithMessage } = useAIAssistant();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    id: '',
    full_name: '',
    username: '',
    email: '',
    cpf: '',
    avatar_url: '',
    last_username_change: null as string | null,
  });
  const [originalUsername, setOriginalUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showUsernameWarning, setShowUsernameWarning] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showFieldEditWarning, setShowFieldEditWarning] = useState<'name' | 'cpf' | null>(null);
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
      .select('id, full_name, username, cpf, avatar_url, last_username_change')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setProfile({
        id: data.id || '',
        full_name: data.full_name || '',
        username: data.username || '',
        email: user.email || '',
        cpf: data.cpf || '',
        avatar_url: data.avatar_url || '',
        last_username_change: data.last_username_change || null,
      });
      setOriginalUsername(data.username || '');
      setNewEmail(user.email || '');
    }
  };

  const canChangeUsername = () => {
    if (!profile.last_username_change) return true;
    const lastChange = new Date(profile.last_username_change);
    const daysSinceChange = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceChange >= 7;
  };

  const getDaysUntilUsernameChange = () => {
    if (!profile.last_username_change) return 0;
    const lastChange = new Date(profile.last_username_change);
    const daysSinceChange = Math.floor((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - daysSinceChange);
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username === originalUsername) {
      setUsernameAvailable(null);
      return;
    }

    // Validar caracteres
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameAvailable(false);
      return;
    }

    // Validar tamanho
    if (username.length < 3 || username.length > 30) {
      setUsernameAvailable(false);
      return;
    }

    // Verificar se é reservado
    if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (error) throw error;
      setUsernameAvailable(!data);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(false);
    } finally {
      setCheckingUsername(false);
    }
  };

  // Debounce para verificação de username
  useEffect(() => {
    const timer = setTimeout(() => {
      if (profile.username && profile.username !== originalUsername) {
        checkUsernameAvailability(profile.username);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [profile.username]);

  const handleSendVerificationCode = async () => {
    if (!newEmail || newEmail === profile.email) {
      toast({
        title: 'Email inválido',
        description: 'Digite um novo email diferente do atual',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido',
        variant: 'destructive',
      });
      return;
    }

    setSendingCode(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('send-email-verification-code', {
        body: { newEmail },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        // Se houver erro HTTP na edge function
        const errorMessage = response.data?.error || response.error.message || 'Erro desconhecido';
        throw new Error(errorMessage);
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Erro ao enviar código');
      }

      setCodeSent(true);
      toast({
        title: 'Código enviado!',
        description: 'Verifique seu email e digite o código de 6 dígitos',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar código',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: 'Código inválido',
        description: 'Digite o código de 6 dígitos',
        variant: 'destructive',
      });
      return;
    }

    setVerifyingCode(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('verify-email-change-code', {
        body: { code: verificationCode },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        const errorMessage = response.data?.error || response.error.message || 'Erro desconhecido';
        throw new Error(errorMessage);
      }

      if (!response.data?.success) {
        throw new Error('Erro ao verificar código');
      }

      toast({
        title: 'Email atualizado!',
        description: 'Faça login novamente com seu novo email',
      });

      // Fazer logout
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error: any) {
      toast({
        title: 'Erro ao verificar código',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar se o username mudou
    const usernameChanged = profile.username !== originalUsername;

    if (usernameChanged) {
      // Validar caracteres
      if (!/^[a-zA-Z0-9_]+$/.test(profile.username)) {
        toast({
          title: 'Username inválido',
          description: 'Use apenas letras, números e underscore (_)',
          variant: 'destructive',
        });
        return;
      }

      // Validar tamanho
      if (profile.username.length < 3 || profile.username.length > 30) {
        toast({
          title: 'Username inválido',
          description: 'O username deve ter entre 3 e 30 caracteres',
          variant: 'destructive',
        });
        return;
      }

      // Verificar se é reservado
      if (RESERVED_USERNAMES.includes(profile.username.toLowerCase())) {
        toast({
          title: 'Username não disponível',
          description: 'Este nome de usuário está reservado pelo sistema',
          variant: 'destructive',
        });
        return;
      }

      // Verificar disponibilidade
      if (usernameAvailable === false) {
        toast({
          title: 'Username não disponível',
          description: 'Este nome de usuário já está em uso',
          variant: 'destructive',
        });
        return;
      }

      // Verificar se pode alterar (7 dias)
      if (!canChangeUsername()) {
        const daysLeft = getDaysUntilUsernameChange();
        toast({
          title: 'Alteração não permitida',
          description: `Você poderá alterar seu username novamente em ${daysLeft} dia(s)`,
          variant: 'destructive',
        });
        return;
      }

      // Mostrar aviso antes de alterar
      setShowUsernameWarning(true);
      return;
    }

    // Se não mudou o username, salvar normalmente
    await saveChanges();
  };

  const saveChanges = async () => {
    setLoading(true);

    try {
      // Validate CPF if being added for the first time
      let updateData: any = {
        full_name: profile.full_name,
      };

      // Se username mudou, incluir na atualização
      if (profile.username !== originalUsername) {
        updateData.username = profile.username;
        updateData.last_username_change = new Date().toISOString();
      }

      // If CPF is being set for the first time, validate and add it
      if (profile.cpf && !profile.cpf.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/)) {
        if (!validateCPF(profile.cpf)) {
          toast({
            title: 'CPF inválido',
            description: 'Por favor, verifique o CPF digitado',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        updateData.cpf = profile.cpf.replace(/\D/g, '');
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

      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });

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

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== `@${profile.username}`) {
      toast({
        title: 'Confirmação incorreta',
        description: `Digite exatamente @${profile.username} para confirmar a exclusão`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Deletar a conta do usuário
      const { error } = await supabase.rpc('delete_own_account');

      if (error) throw error;

      toast({
        title: 'Conta excluída',
        description: 'Sua conta foi excluída permanentemente',
      });

      // Fazer logout e redirecionar
      await supabase.auth.signOut();
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Erro ao excluir conta',
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

          {/* Foto de Perfil */}
          <Card className="bg-card/50 backdrop-blur-sm border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Foto de Perfil
              </CardTitle>
              <CardDescription>
                Obrigatória para enviar mensagens na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfilePhotoUpload
                currentPhotoUrl={profile.avatar_url}
                userName={formatShortName(profile.full_name) || profile.username}
                userId={user?.id || ''}
                onPhotoUpdated={loadProfile}
              />
            </CardContent>
          </Card>

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
                  <Label className="flex items-center gap-2">
                    Nome Completo
                    {profile.cpf && <LockKeyhole className="h-3 w-3 text-muted-foreground" />}
                  </Label>
                  <Input
                    value={formatFullName(profile.full_name)}
                    onChange={(e) => {
                      if (!profile.cpf) {
                        setProfile({ ...profile, full_name: e.target.value });
                      }
                    }}
                    onClick={() => {
                      if (profile.cpf) {
                        setShowFieldEditWarning('name');
                      }
                    }}
                    readOnly={!!profile.cpf}
                    className={profile.cpf ? 'bg-muted cursor-pointer' : ''}
                    placeholder="Seu nome completo"
                  />
                  {profile.cpf && (
                    <p className="text-xs text-muted-foreground">
                      O nome não pode ser alterado após o CPF ser definido. Precisa alterar? Fale com nossa central de ajuda.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Nome de Usuário</Label>
                  <Input
                    value={profile.username}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                      setProfile({ ...profile, username: cleaned });
                    }}
                    placeholder="seu_username"
                    disabled={!canChangeUsername()}
                    className={!canChangeUsername() ? 'bg-muted cursor-not-allowed' : ''}
                  />
                  {profile.username !== originalUsername && (
                    <div className="text-xs">
                      {checkingUsername && (
                        <p className="text-muted-foreground">Verificando disponibilidade...</p>
                      )}
                      {!checkingUsername && usernameAvailable === true && (
                        <p className="text-green-600">✓ Username disponível</p>
                      )}
                      {!checkingUsername && usernameAvailable === false && (
                        <p className="text-destructive">✗ Username não disponível</p>
                      )}
                    </div>
                  )}
                  {!canChangeUsername() && (
                    <p className="text-xs text-muted-foreground">
                      Você poderá alterar seu username novamente em {getDaysUntilUsernameChange()} dia(s)
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Seu perfil: woorkins.com/{profile.username || 'username'}
                    <Link to={`/${profile.username}`} target="_blank">
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => {
                        setNewEmail(e.target.value);
                        setCodeSent(false);
                        setVerificationCode('');
                      }}
                      placeholder="seu@email.com"
                      disabled={codeSent}
                    />
                    {newEmail !== profile.email && !codeSent ? (
                      <Button
                        type="button"
                        onClick={handleSendVerificationCode}
                        disabled={sendingCode || !newEmail}
                        variant="outline"
                      >
                        {sendingCode ? 'Enviando...' : 'Enviar Código'}
                      </Button>
                    ) : codeSent ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled
                      >
                        Código Enviado
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        disabled
                        className="gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Email verificado
                      </Button>
                    )}
                  </div>
                  {codeSent && (
                    <div className="space-y-2 mt-4 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                      <Label>Código de Verificação</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Digite o código de 6 dígitos enviado para {newEmail}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          maxLength={6}
                          className="text-center text-2xl font-mono tracking-widest"
                        />
                        <Button
                          type="button"
                          onClick={handleVerifyCode}
                          disabled={verifyingCode || verificationCode.length !== 6}
                          className="bg-gradient-primary"
                        >
                          {verifyingCode ? 'Verificando...' : 'Verificar'}
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCodeSent(false);
                          setVerificationCode('');
                        }}
                        className="w-full"
                      >
                        Cancelar troca de email
                      </Button>
                    </div>
                  )}
                  {!codeSent && (
                    <p className="text-xs text-muted-foreground">
                      {newEmail !== profile.email 
                        ? '⚠️ Você receberá um código de verificação no novo email'
                        : 'Email atual da conta'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    CPF
                    {profile.cpf && <LockKeyhole className="h-3 w-3 text-muted-foreground" />}
                  </Label>
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
                    onClick={() => {
                      if (profile.cpf) {
                        setShowFieldEditWarning('cpf');
                      }
                    }}
                    readOnly={!!profile.cpf}
                    className={profile.cpf ? 'bg-muted cursor-pointer' : ''}
                    placeholder="000.000.000-00"
                  />
                  <p className="text-xs text-muted-foreground">
                    {profile.cpf 
                      ? 'O CPF não pode ser alterado após definido. CPF errado? Fale com nossa central de ajuda.'
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

          {/* Zona de Perigo */}
          <Card className="bg-card/50 backdrop-blur-sm border-2 border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Zona de Perigo
              </CardTitle>
              <CardDescription>
                Ações irreversíveis que afetam permanentemente sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <h3 className="font-semibold mb-2">Excluir Conta</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  A exclusão da conta é permanente e não pode ser desfeita. Todos os seus dados serão removidos.
                </p>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteDialog(true)}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Minha Conta Permanentemente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de confirmação de alteração de username */}
      <AlertDialog open={showUsernameWarning} onOpenChange={setShowUsernameWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de username</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a alterar seu username para: <strong>{profile.username}</strong></p>
              <p className="text-destructive font-semibold">
                ⚠️ Após confirmar, você só poderá alterar novamente após 7 dias.
              </p>
              <p>Seu perfil público ficará disponível em:</p>
              <p className="font-mono text-sm bg-muted p-2 rounded">
                woorkins.com/{profile.username}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setProfile({ ...profile, username: originalUsername });
              setShowUsernameWarning(false);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUsernameWarning(false);
                saveChanges();
              }}
            >
              Confirmar alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação de exclusão de conta */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Conta Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="space-y-2">
                <p className="text-destructive font-semibold">
                  ⚠️ ATENÇÃO: Esta ação não pode ser desfeita!
                </p>
                <p>
                  Você está prestes a excluir permanentemente sua conta.
                </p>
                <p>Isso irá remover:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Todos os dados do seu perfil</li>
                  <li>Todas as suas mensagens</li>
                  <li>Todos os seus projetos</li>
                  <li>Todo o seu histórico</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="delete-confirmation">
                  Para confirmar, digite <span className="font-mono font-bold">@{profile.username}</span>
                </Label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={`@${profile.username}`}
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmation('');
              setShowDeleteDialog(false);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== `@${profile.username}` || loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Excluindo...' : 'Excluir Permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de aviso para edição de nome/CPF */}
      <AlertDialog open={!!showFieldEditWarning} onOpenChange={(open) => !open && setShowFieldEditWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {showFieldEditWarning === 'name' ? 'Nome não pode ser alterado' : 'CPF não pode ser alterado'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                {showFieldEditWarning === 'name' 
                  ? 'O nome completo não pode ser alterado após o CPF ser definido por questões de segurança e conformidade.'
                  : 'O CPF não pode ser alterado após definido por questões de segurança e conformidade.'}
              </p>
              <p>
                Se você identificou algum erro no seu {showFieldEditWarning === 'name' ? 'nome' : 'CPF'}, 
                entre em contato com nossa central de suporte para que possamos ajudá-lo.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowFieldEditWarning(null)}>
              Sair
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const message = showFieldEditWarning === 'name' 
                  ? 'Preciso alterar meu nome no cadastro'
                  : 'Meu CPF está errado, preciso trocar';
                setShowFieldEditWarning(null);
                openWithMessage(message);
              }}
              className="bg-gradient-primary"
            >
              Falar com o Suporte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Footer />
    </div>
  );
}
