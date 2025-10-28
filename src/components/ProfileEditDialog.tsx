import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';
import { Save, User, MapPin, FileText, Mail, Calendar, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatFullName, formatShortName, validateCPF } from '@/lib/utils';
import { Link } from 'react-router-dom';
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

// Nomes reservados do sistema
const RESERVED_USERNAMES = [
  'admin', 'root', 'woorkins', 'api', 'app', 'web', 'www', 'supabase', 
  'auth', 'login', 'signup', 'dashboard', 'painel', 'perfil', 'profile',
  'conta', 'account', 'configuracoes', 'settings', 'projetos', 'projects',
  'mensagens', 'messages', 'notificacoes', 'notifications', 'buscar', 'search',
  'ajuda', 'help', 'suporte', 'support', 'sobre', 'about', 'contato', 'contact',
  'termos', 'terms', 'privacidade', 'privacy', 'feed', 'moderador',
  'moderator', 'sistema', 'system', 'equipe', 'team', 'blog', 'noticias', 'news',
  'pagamento', 'payment', 'checkout', 'success', 'error', 'financeiro', 'finances'
];

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  profileId?: string; // ID do perfil a ser editado (opcional, melhora precisão)
  onUpdate?: () => void;
}

export function ProfileEditDialog({ open, onOpenChange, userId, profileId, onUpdate }: ProfileEditDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    id: '',
    full_name: '',
    username: '',
    email: '',
    cpf: '',
    avatar_url: '',
    location: '',
    bio: '',
    website: '',
    birth_date: '',
    last_username_change: null as string | null,
    profile_type: 'user' as 'user' | 'business',
    slug: '',
  });
  const [originalUsername, setOriginalUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showUsernameWarning, setShowUsernameWarning] = useState(false);

  useEffect(() => {
    if (open && userId) {
      loadProfile();
    }
  }, [open, userId]);

  const loadProfile = async () => {
    try {
      console.log('[ProfileEditDialog] Loading profile - userId:', userId, 'profileId:', profileId);

      let profileData = null;

      // Se profileId foi fornecido, carregar diretamente por ID (mais preciso)
      if (profileId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .maybeSingle();

        if (error) {
          console.error('[ProfileEditDialog] Error loading by profileId:', error);
        } else {
          profileData = data;
        }
      }

      // Se não carregou por ID, usar fallback por user_id priorizando 'user'
      if (!profileData) {
        console.log('[ProfileEditDialog] Fallback: loading by user_id');
        
        // 1) Tenta buscar o perfil principal do tipo 'user'
        const { data: userProfile, error: userProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .eq('profile_type', 'user')
          .maybeSingle();

        if (userProfileError) {
          console.warn('[ProfileEditDialog] user profile fetch error (will fallback):', userProfileError);
        }

        profileData = userProfile;

        // 2) Se não houver, pega o primeiro perfil do usuário (ex.: business)
        if (!profileData) {
          const { data: anyProfile, error: anyProfileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (anyProfileError) {
            console.error('[ProfileEditDialog] Fallback profile fetch error:', anyProfileError);
          }
          profileData = anyProfile || null;
        }
      }

      console.log('[ProfileEditDialog] Resolved profile data:', profileData);

      if (!profileData) {
        toast({
          title: 'Perfil não encontrado',
          description: 'Não foi possível encontrar seu perfil. Tente fazer logout e login novamente.',
          variant: 'destructive',
        });
        return;
      }

      // Buscar email do auth
      const { data: { user } } = await supabase.auth.getUser();

      setProfile({
        id: profileData.id,
        full_name: profileData.full_name || '',
        username: profileData.username || '',
        email: user?.email || '',
        cpf: profileData.cpf || '',
        avatar_url: profileData.avatar_url || '',
        location: profileData.location || '',
        bio: profileData.bio || '',
        website: profileData.website || '',
        birth_date: profileData.birth_date || '',
        last_username_change: profileData.last_username_change,
        profile_type: (profileData.profile_type as 'user' | 'business') || 'user',
        slug: profileData.slug || '',
      });
      setOriginalUsername(profileData.username || '');
    } catch (error: any) {
      console.error('[ProfileEditDialog] Unexpected error:', error);
      toast({
        title: 'Erro inesperado',
        description: error.message || 'Ocorreu um erro ao carregar o perfil.',
        variant: 'destructive',
      });
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
      // Verificar se existe como username em qualquer perfil
      const { data: existingUsername, error: usernameError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', username)
        .neq('id', profile.id)
        .maybeSingle();

      if (usernameError) throw usernameError;
      
      if (existingUsername) {
        setUsernameAvailable(false);
        setCheckingUsername(false);
        return;
      }

      // Verificar se conflita com slug de algum perfil business
      const { data: existingSlug, error: slugError } = await supabase
        .from('profiles')
        .select('id, slug')
        .eq('slug', username)
        .eq('profile_type', 'business')
        .neq('id', profile.id)
        .maybeSingle();

      if (slugError) throw slugError;

      setUsernameAvailable(!existingSlug);
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

  const handleSave = async () => {
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
    try {
      setLoading(true);

      const updateData: any = {
        full_name: profile.full_name,
        location: profile.location,
        bio: profile.bio,
        website: profile.website,
      };

      // Se username mudou, incluir na atualização
      if (profile.username !== originalUsername) {
        updateData.username = profile.username;
        updateData.last_username_change = new Date().toISOString();
        // Sincronizar slug para perfis business e liberar identificador antigo
        if (profile.profile_type === 'business') {
          updateData.slug = profile.username;
        }
      }

      // Validar e atualizar CPF se estiver sendo definido pela primeira vez
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

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso' + (profile.username !== originalUsername ? '. Próxima alteração de username disponível em 7 dias.' : ''),
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="geral" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="geral">Informações Gerais</TabsTrigger>
              <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="geral" className="space-y-6 m-0">
                {/* Foto de Perfil */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Foto de Perfil</CardTitle>
                    <CardDescription>
                      Esta foto será usada em todo o sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProfilePhotoUpload
                      currentPhotoUrl={profile.avatar_url}
                      userName={formatShortName(profile.full_name) || profile.username}
                      profileId={profile.id}
                      onPhotoUpdated={loadProfile}
                    />
                  </CardContent>
                </Card>

                {/* Informações Básicas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Informações Básicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Nome Completo</Label>
                        <Input
                          id="full_name"
                          value={formatFullName(profile.full_name)}
                          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                          disabled={!!profile.cpf}
                          className={profile.cpf ? 'bg-muted' : ''}
                        />
                        {profile.cpf && (
                          <p className="text-xs text-muted-foreground">
                            Nome bloqueado após definir CPF
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="username">
                          Username
                          {!canChangeUsername() && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (Disponível em {getDaysUntilUsernameChange()} dia{getDaysUntilUsernameChange() !== 1 ? 's' : ''})
                            </span>
                          )}
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                          <Input
                            id="username"
                            value={profile.username}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                              setProfile({ ...profile, username: cleaned });
                            }}
                            disabled={!canChangeUsername()}
                            className={`pl-7 ${!canChangeUsername() ? 'bg-muted' : ''}`}
                          />
                          {profile.username !== originalUsername && (
                            <div className="mt-1 text-xs">
                              {checkingUsername ? (
                                <span className="text-muted-foreground">Verificando disponibilidade...</span>
                              ) : usernameAvailable === true ? (
                                <span className="text-green-600">✓ Username disponível</span>
                              ) : usernameAvailable === false ? (
                                <span className="text-destructive">✗ Username não disponível</span>
                              ) : null}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          Seu perfil: woorkins.com/{profile.username || 'username'}
                          <Link to={`/${profile.username}`} target="_blank">
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">
                          <Mail className="w-4 h-4 inline mr-1" />
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email não pode ser alterado aqui
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input
                          id="cpf"
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
                        {profile.cpf && (
                          <p className="text-xs text-muted-foreground">
                            CPF não pode ser alterado
                          </p>
                        )}
                      </div>

                      {profile.birth_date && (
                        <div className="space-y-2">
                          <Label>
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Data de Nascimento
                          </Label>
                          <Input
                            value={new Date(profile.birth_date).toLocaleDateString('pt-BR')}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Localização e Contato */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Localização e Contato
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Localização</Label>
                      <Input
                        id="location"
                        value={profile.location}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        placeholder="Cidade, Estado"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={profile.website}
                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                        placeholder="https://seusite.com"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="detalhes" className="space-y-6 m-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Sobre Você
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bio">Biografia</Label>
                      <Textarea
                        id="bio"
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="Conte um pouco sobre você..."
                        rows={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        Máximo 500 caracteres
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de alteração de username */}
      <AlertDialog open={showUsernameWarning} onOpenChange={setShowUsernameWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar alteração de username
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a alterar seu username de <strong>@{originalUsername}</strong> para <strong>@{profile.username}</strong>.
              </p>
              <p className="text-amber-600 dark:text-amber-500 font-medium">
                ⚠️ Após confirmar, você só poderá alterar o username novamente após 7 dias.
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
    </>
  );
}
