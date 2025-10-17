import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Search, X, UserPlus, Shield } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BusinessAdmin {
  id: string;
  profile_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  permissions: {
    edit_profile: boolean;
    manage_posts: boolean;
    manage_appointments: boolean;
    manage_products: boolean;
    view_finances: boolean;
    manage_team: boolean;
  };
  profiles: {
    full_name: string;
    username: string;
  };
}

interface SearchedProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
}

interface BusinessAdministratorsProps {
  businessId: string;
}

export default function BusinessAdministrators({ businessId }: BusinessAdministratorsProps) {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<BusinessAdmin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<SearchedProfile | null>(null);
  const [permissions, setPermissions] = useState({
    edit_profile: false,
    manage_posts: false,
    manage_appointments: false,
    manage_products: false,
    view_finances: false,
    manage_team: false,
  });
  const [adminToRemove, setAdminToRemove] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, [businessId]);

  // Busca ao vivo com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadAdmins = async () => {
    const { data, error } = await supabase
      .from('business_admins')
      .select(`
        id,
        profile_id,
        permissions,
        status,
        profiles:profile_id (
          full_name,
          username
        )
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAdmins(data as any);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
      .limit(10);

    if (!error && data) {
      // Filter out profiles that are already admins
      const filtered = data.filter(
        (profile: SearchedProfile) =>
          !admins.some((admin) => admin.profile_id === profile.id)
      );
      setSearchResults(filtered as SearchedProfile[]);
    } else {
      toast({
        title: 'Erro ao buscar',
        description: 'Não foi possível buscar usuários',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleAddAdmin = async () => {
    if (!selectedProfile) return;

    setLoading(true);
    const { error } = await supabase
      .from('business_admins')
      .insert({
        business_id: businessId,
        profile_id: selectedProfile.id,
        permissions,
        status: 'pending',
      });

    if (!error) {
      // Criar notificação para o usuário convidado
      await supabase.from('notifications').insert({
        user_id: selectedProfile.id,
        type: 'admin_invite',
        title: 'Convite para Administrador',
        message: 'Você foi convidado para gerenciar um perfil de negócio',
        link: `/admin-invites`,
      });

      toast({
        title: 'Convite enviado!',
        description: `Convite enviado para ${selectedProfile.full_name}. Aguardando resposta.`,
      });
      setSelectedProfile(null);
      setSearchQuery('');
      setSearchResults([]);
      setPermissions({
        edit_profile: false,
        manage_posts: false,
        manage_appointments: false,
        manage_products: false,
        view_finances: false,
        manage_team: false,
      });
      setShowAddForm(false);
      setShowConfirmDialog(false);
      loadAdmins();
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o convite',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleRemoveAdmin = async (adminId: string) => {
    const { error } = await supabase
      .from('business_admins')
      .delete()
      .eq('id', adminId);

    if (!error) {
      toast({
        title: 'Administrador removido',
        description: 'O administrador foi removido com sucesso',
      });
      loadAdmins();
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o administrador',
        variant: 'destructive',
      });
    }
    setAdminToRemove(null);
  };

  const permissionLabels = {
    edit_profile: 'Editar Perfil',
    manage_posts: 'Gerenciar Posts',
    manage_appointments: 'Gerenciar Agendamentos',
    manage_products: 'Gerenciar Produtos',
    view_finances: 'Ver Finanças',
    manage_team: 'Gerenciar Equipe',
  };

  return (
    <div className="space-y-6">
      {/* Botão Novo Administrador */}
      {!showAddForm && (
        <div className="flex justify-end">
          <Button onClick={() => setShowAddForm(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Novo Administrador
          </Button>
        </div>
      )}

      {/* Add Admin Form */}
      {showAddForm && (
        <Card className="bg-card/50 backdrop-blur-sm border-2">
          <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Shield className="w-5 h-5" />
                  Adicionar Administrador
                </CardTitle>
                <CardDescription>
                  Procure e adicione um usuário como administrador do perfil
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedProfile(null);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Search Section */}
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  ℹ️ Para adicionar um administrador, a pessoa precisa estar cadastrada no Woorkins primeiro. 
                  Digite pelo menos 2 caracteres para buscar.
                </p>
              </div>

              <div className="relative">
                <Input
                  placeholder="Buscar por nome ou usuário..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
                {loading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!loading && searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <Label>Resultados ({searchResults.length}):</Label>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {searchResults.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      >
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.full_name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                            <span className="text-primary font-medium">
                              {profile.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{profile.full_name}</p>
                          <p className="text-sm text-muted-foreground">@{profile.username}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setSelectedProfile(profile)}
                          variant={selectedProfile?.id === profile.id ? 'default' : 'outline'}
                        >
                          {selectedProfile?.id === profile.id ? 'Selecionado' : 'Selecionar'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Permissions Selection */}
              {selectedProfile && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div>
                    <h3 className="font-medium mb-2">Adicionar: {selectedProfile.full_name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Selecione as permissões que deseja conceder:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(permissionLabels).map(([key, label]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={permissions[key as keyof typeof permissions]}
                          onCheckedChange={(checked) =>
                            setPermissions((prev) => ({
                              ...prev,
                              [key]: checked,
                            }))
                          }
                        />
                        <Label htmlFor={key} className="cursor-pointer">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => setShowConfirmDialog(true)} className="flex-1">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Adicionar Administrador
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedProfile(null);
                        setSearchResults([]);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Admins List */}
      <Card className="bg-card/50 backdrop-blur-sm border-2">
        <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b">
          <CardTitle className="text-base">Administradores Atuais</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {admins.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum administrador adicionado ainda
            </p>
          ) : (
            <div className="space-y-4">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-start justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium">{admin.profiles.full_name}</p>
                      {admin.status === 'pending' && (
                        <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-full">
                          Pendente
                        </span>
                      )}
                      {admin.status === 'accepted' && (
                        <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                          Ativo
                        </span>
                      )}
                      {admin.status === 'rejected' && (
                        <span className="text-xs px-2 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full">
                          Recusado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      @{admin.profiles.username}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(admin.permissions)
                        .filter(([_, value]) => value)
                        .map(([key]) => (
                          <span
                            key={key}
                            className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full"
                          >
                            {permissionLabels[key as keyof typeof permissionLabels]}
                          </span>
                        ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAdminToRemove(admin.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Add Admin Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Convite</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a enviar um convite de administrador para:
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedProfile && (
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              {selectedProfile.avatar_url ? (
                <img
                  src={selectedProfile.avatar_url}
                  alt={selectedProfile.full_name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                  <span className="text-primary font-medium text-xl">
                    {selectedProfile.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-lg">{selectedProfile.full_name}</p>
                <p className="text-sm text-muted-foreground">@{selectedProfile.username}</p>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            O usuário receberá uma notificação e poderá aceitar ou recusar o convite.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddAdmin} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Convite'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!adminToRemove} onOpenChange={() => setAdminToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Administrador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este administrador? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => adminToRemove && handleRemoveAdmin(adminToRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
