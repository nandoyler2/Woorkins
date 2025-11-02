import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SafeImage } from '@/components/ui/safe-image';
import { User, Mail, Calendar, MapPin, FileText, Upload, Save, AlertTriangle, Trash2 } from 'lucide-react';
import { formatShortName } from '@/lib/utils';

interface UserAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    user_id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    cpf: string | null;
    birth_date: string | null;
    location: string | null;
    bio: string | null;
    filiation: string | null;
    nationality: string | null;
    place_of_birth: string | null;
    document_verified: boolean;
    approved_document: any;
  };
  onUpdate: () => void;
}

export function UserAccountDialog({ open, onOpenChange, user, onUpdate }: UserAccountDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [lastUsernameChange, setLastUsernameChange] = useState<Date | null>(null);
  const [showUsernameWarning, setShowUsernameWarning] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    username: user.username || '',
    email: '',
    cpf: user.cpf || '',
    birth_date: user.birth_date || '',
    location: user.location || '',
    bio: user.bio || '',
    filiation: user.filiation || '',
    nationality: user.nationality || '',
    place_of_birth: user.place_of_birth || '',
  });

  // Nomes reservados do sistema
  const RESERVED_USERNAMES = [
    'admin', 'administrador', 'suporte', 'support', 'moderator', 'moderacao',
    'sistema', 'system', 'woorkins', 'api', 'root', 'sudo',
    'auth', 'login', 'logout', 'signup', 'signin', 'register', 'cadastro',
    'perfil', 'profile', 'conta', 'account', 'settings', 'configuracoes',
    'mensagens', 'messages', 'projetos', 'projects', 'projeto', 'project',
    'feed', 'empresa', 'business', 'businesses', 'empresas',
    'painel', 'dashboard', 'admin', 'financeiro', 'woorkoins',
    'sobre', 'about', 'contato', 'contact', 'ajuda', 'help',
    'termos', 'terms', 'privacidade', 'privacy', 'politica', 'policy',
    'autenticacao', 'meus-projetos', 'editar', 'edit', 'novo', 'new'
  ];

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Buscar email do usuário via edge function
        try {
          const { data: emailData, error: emailError } = await supabase.functions.invoke('get-user-email', {
            body: { userId: user.user_id }
          });
          
          if (!emailError && emailData?.email) {
            setUserEmail(emailData.email);
            setFormData(prev => ({ ...prev, email: emailData.email }));
          }
        } catch (error) {
          console.error('Error fetching email:', error);
        }

        // Atualizar formData com todos os dados do usuário
        setFormData(prev => ({ 
          ...prev,
          cpf: user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '',
          birth_date: user.birth_date || '',
          full_name: user.full_name || '',
          username: user.username || '',
          location: user.location || '',
          bio: user.bio || '',
          filiation: user.filiation || '',
          nationality: user.nationality || '',
          place_of_birth: user.place_of_birth || ''
        }));

        // Buscar data da última alteração de username
        const { data: profileData } = await supabase
          .from('profiles')
          .select('last_username_change')
          .eq('id', user.id)
          .single();
        
        if (profileData?.last_username_change) {
          setLastUsernameChange(new Date(profileData.last_username_change));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    if (open) {
      loadUserData();
    }
  }, [open, user.user_id, user.id, user.cpf, user.birth_date, user.full_name, user.username, user.location, user.bio, user.filiation, user.nationality, user.place_of_birth]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      // Validar tipo e tamanho
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Erro',
          description: 'Por favor, selecione uma imagem',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Erro',
          description: 'A imagem deve ter no máximo 5MB',
          variant: 'destructive',
        });
        return;
      }

      // Upload para o storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.user_id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Atualizar perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Sucesso',
        description: 'Foto de perfil atualizada',
      });

      onUpdate();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Erro ao fazer upload',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const canChangeUsername = () => {
    if (!lastUsernameChange) return true;
    const daysSinceChange = (new Date().getTime() - lastUsernameChange.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange >= 7;
  };

  const getDaysUntilUsernameChange = () => {
    if (!lastUsernameChange) return 0;
    const daysSinceChange = (new Date().getTime() - lastUsernameChange.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(7 - daysSinceChange));
  };

  // Verificar disponibilidade do username
  const checkUsernameAvailability = async (username: string) => {
    if (!username || username === user.username) {
      setUsernameAvailable(null);
      return;
    }

    // Verificar se é um nome reservado
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
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  // Debounce para verificação de username
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.username && formData.username !== user.username) {
        checkUsernameAvailability(formData.username);
      } else {
        setUsernameAvailable(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username]);

  const handleSave = async () => {
    // Admin pode editar username sem restrições - validar apenas se mudou
    if (formData.username !== user.username) {
      // Verificar se é um nome reservado
      if (RESERVED_USERNAMES.includes(formData.username.toLowerCase())) {
        toast({
          title: 'Username não disponível',
          description: 'Este username está reservado pelo sistema.',
          variant: 'destructive',
        });
        return;
      }

      // Verificar disponibilidade
      if (usernameAvailable === false) {
        toast({
          title: 'Username não disponível',
          description: 'Este username já está em uso. Por favor, escolha outro.',
          variant: 'destructive',
        });
        return;
      }
    }

    await saveChanges();
  };

  const saveChanges = async () => {
    try {
      setLoading(true);

      const usernameChanged = formData.username !== user.username;

      // Preparar dados
      const updateData: any = {
        full_name: formData.full_name.trim(),
        cpf: formData.cpf.replace(/[^\d]/g, ''),
        birth_date: formData.birth_date || null,
        location: formData.location?.trim() || null,
        bio: formData.bio?.trim() || null,
        filiation: formData.filiation?.trim() || null,
        nationality: formData.nationality?.trim() || null,
        place_of_birth: formData.place_of_birth?.trim() || null,
      };

      if (usernameChanged) {
        updateData.username = formData.username.trim();
      }

      // Atualização via Edge Function (service role) para bypass de RLS
      const { data, error } = await supabase.functions.invoke('admin-update-profile', {
        body: {
          profileId: user.id,
          userId: user.user_id,
          data: updateData,
          email: formData.email
        }
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Informações atualizadas com sucesso',
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível salvar as alterações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (deleteConfirmation !== `@${user.username}`) {
      toast({
        title: 'Confirmação incorreta',
        description: `Digite exatamente @${user.username} para confirmar a exclusão`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Deletar o usuário (isso vai deletar o profile em cascata)
      const { error } = await supabase.auth.admin.deleteUser(user.user_id);

      if (error) throw error;

      toast({
        title: 'Perfil excluído',
        description: 'O perfil foi excluído permanentemente',
      });

      onUpdate();
      onOpenChange(false);
      setShowDeleteDialog(false);
      setDeleteConfirmation('');
    } catch (error: any) {
      console.error('Error deleting profile:', error);
      toast({
        title: 'Erro ao excluir',
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Edite as informações do perfil de {formatShortName(user.full_name)}
            </DialogDescription>
          </DialogHeader>

        <div className="space-y-6">
          {/* Foto de Perfil */}
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <Avatar className="h-20 w-20">
              {user.avatar_url ? (
                <SafeImage src={user.avatar_url} alt={user.full_name} className="object-cover" />
              ) : (
                <AvatarFallback className="text-2xl">
                  {formatShortName(user.full_name).charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button type="button" variant="outline" disabled={uploading} asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Enviando...' : 'Alterar Foto'}
                  </span>
                </Button>
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG ou WEBP. Máximo 5MB.
              </p>
            </div>
          </div>

          {/* Informações Pessoais */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Informações Pessoais
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">
                  Username
                  <span className="text-xs text-muted-foreground ml-2">
                    (Admin pode editar sempre)
                  </span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input 
                    id="username"
                    value={formData.username} 
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() })}
                    className="pl-7"
                  />
                  {formData.username !== user.username && (
                    <div className="mt-1 text-xs">
                      {checkingUsername ? (
                        <span className="text-muted-foreground">Verificando disponibilidade...</span>
                      ) : usernameAvailable === true ? (
                        <span className="text-green-600 dark:text-green-500">✓ Username disponível</span>
                      ) : usernameAvailable === false ? (
                        <span className="text-destructive">✗ Username não disponível</span>
                      ) : null}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Seu perfil: woorkins.com/{formData.username || 'username'}
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input 
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    const formatted = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                    setFormData({ ...formData, cpf: formatted });
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_date">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Data de Nascimento
                </Label>
                <Input 
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Localização
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Cidade, Estado"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Sobre você..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Informações do Documento (Apenas Exibição para Admin) */}
          {user.approved_document && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Informações Extraídas do Documento
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Filiação</Label>
                  <Input
                    value={formData.filiation}
                    onChange={(e) => setFormData({ ...formData, filiation: e.target.value })}
                    placeholder="Nome da mãe/pai"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Naturalidade</Label>
                  <Input
                    value={formData.place_of_birth}
                    onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                    placeholder="Cidade/Estado de nascimento"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Nacionalidade</Label>
                  <Input
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    placeholder="País"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Zona de Perigo */}
          <div className="space-y-4 p-4 border-2 border-destructive/20 rounded-lg bg-destructive/5">
            <h3 className="font-semibold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Zona de Perigo
            </h3>
            <p className="text-sm text-muted-foreground">
              A exclusão do perfil é permanente e não pode ser desfeita. Todos os dados do usuário serão removidos.
            </p>
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Perfil Permanentemente
            </Button>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Aviso de alteração de username */}
      <AlertDialog open={showUsernameWarning} onOpenChange={setShowUsernameWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar alteração de username
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a alterar o username de <strong>@{user.username}</strong> para <strong>@{formData.username}</strong>.
              </p>
              <p className="text-amber-600 dark:text-amber-500 font-medium">
                ⚠️ Após confirmar, você só poderá alterar o username novamente após 7 dias.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={saveChanges}>
              Confirmar alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Perfil Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="space-y-2">
                <p className="text-destructive font-semibold">
                  ⚠️ ATENÇÃO: Esta ação não pode ser desfeita!
                </p>
                <p>
                  Você está prestes a excluir permanentemente o perfil de <strong>{formatShortName(user.full_name)}</strong>.
                </p>
                <p>Isso irá remover:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Todos os dados do perfil</li>
                  <li>Todas as mensagens</li>
                  <li>Todos os projetos</li>
                  <li>Todo o histórico do usuário</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="delete-confirmation">
                  Para confirmar, digite <span className="font-mono font-bold">@{user.username}</span>
                </Label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={`@${user.username}`}
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
              onClick={handleDeleteProfile}
              disabled={deleteConfirmation !== `@${user.username}` || loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Excluindo...' : 'Excluir Permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
