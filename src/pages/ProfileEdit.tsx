import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';
import { 
  ArrowLeft, Save, User, Globe, Settings as SettingsIcon, Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  website: string | null;
}

type Section = 'info' | 'social' | 'settings';

export default function ProfileEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('info');

  const menuItems = [
    { id: 'info' as Section, label: 'Informações Básicas', icon: User, color: 'text-blue-500' },
    { id: 'social' as Section, label: 'Redes Sociais', icon: Globe, color: 'text-purple-500' },
    { id: 'settings' as Section, label: 'Configurações', icon: SettingsIcon, color: 'text-orange-500' },
  ];

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o perfil',
        variant: 'destructive',
      });
      navigate('/painel');
      return;
    }

    setProfile(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Perfil atualizado',
        description: 'Suas alterações foram salvas com sucesso!',
      });
    }

    setSaving(false);
  };

  const handlePhotoUpdated = () => {
    // Reload profile after photo update
    loadProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      
      <SidebarProvider>
        <div className="flex w-full min-h-[calc(100vh-64px)] relative">
          {/* Sidebar */}
          <Sidebar className="border-r bg-card/50 backdrop-blur-sm z-10" style={{ top: '64px', height: 'calc(100svh - 64px)' }}>
            <SidebarContent>
              <div className="p-4 border-b space-y-3">
                <h2 className="text-lg font-bold px-2">Editar Perfil</h2>
                <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                  <Link to="/painel">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Painel
                  </Link>
                </Button>
              </div>

              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => setActiveSection(item.id)}
                            className={`
                              ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'}
                              transition-all duration-200
                            `}
                          >
                            <Icon className={`w-5 h-5 mr-3 ${isActive ? item.color : 'text-muted-foreground'}`} />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-6 py-8 max-w-5xl">
              {/* Header do perfil */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">{profile.full_name || profile.username}</h1>
                <p className="text-muted-foreground">@{profile.username}</p>
              </div>

              {/* Informações Básicas */}
              {activeSection === 'info' && (
                <div className="space-y-6 animate-fade-in">
                  <Card className="bg-card/50 backdrop-blur-sm border-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-blue-600">
                        <User className="w-5 h-5" />
                        Foto de Perfil
                      </CardTitle>
                      <CardDescription>Sua imagem de perfil no Woorkins</CardDescription>
                    </div>
                    <CardContent className="p-6">
                      <ProfilePhotoUpload
                        currentPhotoUrl={profile.avatar_url || undefined}
                        userName={profile.full_name || profile.username}
                        userId={profile.user_id}
                        onPhotoUpdated={handlePhotoUpdated}
                      />
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 p-6 border-b">
                      <CardTitle className="text-blue-600">Dados Pessoais</CardTitle>
                    </div>
                    <CardContent className="p-6">
                      <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-base font-medium">Nome Completo</Label>
                          <Input
                            value={profile.full_name || ''}
                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                            placeholder="Seu nome completo"
                            className="text-base"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-base font-medium">Biografia</Label>
                          <Textarea
                            value={profile.bio || ''}
                            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                            rows={4}
                            placeholder="Conte um pouco sobre você..."
                            className="text-base resize-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-base font-medium">Localização</Label>
                          <Input
                            value={profile.location || ''}
                            onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                            placeholder="Cidade, Estado"
                            className="text-base"
                          />
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg transition-all text-base py-6" 
                          disabled={saving}
                        >
                          <Save className="w-5 h-5 mr-2" />
                          {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Redes Sociais */}
              {activeSection === 'social' && (
                <div className="space-y-6 animate-fade-in">
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-purple-600">
                        <Globe className="w-5 h-5" />
                        Links e Redes Sociais
                      </CardTitle>
                      <CardDescription>Compartilhe seus links importantes</CardDescription>
                    </div>
                    <CardContent className="p-6">
                      <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-base font-medium">Website</Label>
                          <Input
                            type="url"
                            value={profile.website || ''}
                            onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                            placeholder="https://seusite.com"
                            className="text-base"
                          />
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg transition-all text-base py-6" 
                          disabled={saving}
                        >
                          <Save className="w-5 h-5 mr-2" />
                          {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Configurações */}
              {activeSection === 'settings' && (
                <div className="space-y-6 animate-fade-in">
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-orange-600">
                        <SettingsIcon className="w-5 h-5" />
                        Configurações do Perfil
                      </CardTitle>
                      <CardDescription>Gerencie as configurações da sua conta</CardDescription>
                    </div>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Username</p>
                            <p className="text-sm text-muted-foreground">@{profile.username}</p>
                          </div>
                          <Button variant="outline" size="sm" disabled>
                            Alterar
                          </Button>
                        </div>

                        <div className="p-4 border rounded-lg bg-muted/30">
                          <Info className="w-5 h-5 mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Para alterar seu email ou senha, vá para a página de Conta no menu principal.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}
