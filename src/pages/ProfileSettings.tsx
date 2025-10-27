import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';
import { ImageUpload } from '@/components/ImageUpload';
import { UnifiedPortfolioManager } from '@/components/unified/UnifiedPortfolioManager';
import { GenericBannersManager } from '@/components/generic/GenericBannersManager';
import { GenericCatalogManager } from '@/components/generic/GenericCatalogManager';
import { UnifiedVideoManager } from '@/components/unified/UnifiedVideoManager';
import { UnifiedSocialManager } from '@/components/unified/UnifiedSocialManager';
import { UnifiedWhatsAppManager } from '@/components/unified/UnifiedWhatsAppManager';
import { GenericCertificationsManager } from '@/components/generic/GenericCertificationsManager';
import { GenericJobVacanciesManager } from '@/components/generic/GenericJobVacanciesManager';
import { GenericAppointmentsManager } from '@/components/generic/GenericAppointmentsManager';
import { GenericTestimonialsManager } from '@/components/generic/GenericTestimonialsManager';
import { ArrowLeft, Save } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  profile_type: string;
  username?: string;
  slug?: string;
  full_name?: string;
  company_name?: string;
  bio?: string;
  description?: string;
  avatar_url?: string;
  logo_url?: string;
  cover_url?: string;
  address?: string;
  website_url?: string;
}

export default function ProfileSettings() {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    bio: '',
    description: '',
    address: '',
    website_url: '',
  });

  // Features state
  const [features, setFeatures] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (profileId) {
      loadProfile();
      loadFeatures();
    }
  }, [profileId]);

  const loadProfile = async () => {
    if (!profileId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .eq('user_id', user?.id)
      .single();

    if (error) {
      console.error('Erro ao carregar perfil:', error);
      toast({
        title: 'Erro ao carregar perfil',
        description: 'Você não tem permissão para editar este perfil',
        variant: 'destructive',
      });
      navigate('/account');
      return;
    }

    setProfile(data);
    setFormData({
      full_name: data.full_name || '',
      company_name: data.company_name || '',
      bio: data.bio || '',
      description: data.description || '',
      address: data.address || '',
      website_url: data.website_url || '',
    });
    setLoading(false);
  };

  const loadFeatures = async () => {
    if (!profileId) return;

    const { data } = await supabase
      .from('profile_features')
      .select('*')
      .eq('profile_id', profileId);

    const featuresMap = new Map(data?.map((f: any) => [f.feature_key, f.is_active]) || []);
    setFeatures(featuresMap);
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    const updates: any = { id: profile.id };

    if (profile.profile_type === 'business') {
      updates.company_name = formData.company_name;
      updates.description = formData.description;
      updates.address = formData.address;
      updates.website_url = formData.website_url;
    } else {
      updates.full_name = formData.full_name;
      updates.bio = formData.bio;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    setSaving(false);

    if (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Alterações salvas com sucesso!' });
      loadProfile();
    }
  };

  const handleToggleFeature = async (featureKey: string) => {
    if (!profile) return;

    const newActiveState = !features.get(featureKey);
    const { error } = await supabase
      .from('profile_features')
      .upsert({
        profile_id: profile.id,
        feature_key: featureKey,
        is_active: newActiveState,
        settings: {}
      }, {
        onConflict: 'profile_id,feature_key'
      });

    if (!error) {
      setFeatures(new Map(features.set(featureKey, newActiveState)));
      toast({ title: newActiveState ? 'Ferramenta ativada' : 'Ferramenta desativada' });
    } else {
      console.error('Erro ao atualizar ferramenta:', error);
      toast({
        title: 'Erro ao atualizar ferramenta',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handlePhotoUpload = async (url: string) => {
    if (!profile) return;

    const updateField = profile.profile_type === 'business' ? 'logo_url' : 'avatar_url';
    const { error } = await supabase
      .from('profiles')
      .update({ [updateField]: url })
      .eq('id', profile.id);

    if (error) {
      toast({
        title: 'Erro ao atualizar foto',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      setProfile({ ...profile, [updateField]: url } as Profile);
      toast({ title: 'Foto atualizada!' });
    }
  };

  const handlePhotoDelete = async () => {
    if (!profile) return;

    const updateField = profile.profile_type === 'business' ? 'logo_url' : 'avatar_url';
    const { error } = await supabase
      .from('profiles')
      .update({ [updateField]: null })
      .eq('id', profile.id);

    if (error) {
      toast({
        title: 'Erro ao remover foto',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      setProfile({ ...profile, [updateField]: null } as Profile);
      toast({ title: 'Foto removida!' });
    }
  };

  const handleCoverUpload = async (url: string) => {
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({ cover_url: url })
      .eq('id', profile.id);

    if (error) {
      toast({
        title: 'Erro ao atualizar capa',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      setProfile({ ...profile, cover_url: url });
      toast({ title: 'Capa atualizada!' });
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Carregando...</div>;
  }

  if (!profile) {
    return <div className="container mx-auto p-6">Perfil não encontrado</div>;
  }

  const isBusinessProfile = profile.profile_type === 'business';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/account')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">
          Configurações {isBusinessProfile ? 'do Perfil Profissional' : 'do Perfil'}
        </h1>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="photos">Fotos</TabsTrigger>
          <TabsTrigger value="tools">Ferramentas</TabsTrigger>
          <TabsTrigger value="portfolio">Portfólio</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
          <TabsTrigger value="video">Vídeo</TabsTrigger>
          <TabsTrigger value="more">Mais</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Informações Básicas</h2>
            
            {isBusinessProfile ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Nome da Empresa *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website_url">Website</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                  />
                </div>
              </>
            )}

            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="photos">
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {isBusinessProfile ? 'Logo' : 'Foto de Perfil'}
              </h2>
              <ProfilePhotoUpload
                currentPhotoUrl={isBusinessProfile ? profile.logo_url : profile.avatar_url}
                userName={isBusinessProfile ? (profile.company_name || '') : (profile.full_name || '')}
                profileId={profile.id}
                onPhotoUpdated={() => loadProfile()}
              />
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Foto de Capa</h2>
              <ImageUpload
                currentImageUrl={profile.cover_url || null}
                onUpload={handleCoverUpload}
                bucket={isBusinessProfile ? 'business-covers' : 'user-covers'}
                folder={profile.id}
                type="cover"
              />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tools">
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Ferramentas do Perfil</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {['portfolio', 'banners', 'catalog', 'video', 'social', 'whatsapp', 'certifications', 'vacancies', 'appointments', 'testimonials'].map((key) => (
                <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                  <span className="capitalize">{key}</span>
                  <Button
                    variant={features.get(key) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleToggleFeature(key)}
                  >
                    {features.get(key) ? 'Ativo' : 'Inativo'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio">
          <UnifiedPortfolioManager profileId={profile.id} />
        </TabsContent>

        <TabsContent value="banners">
          <GenericBannersManager entityId={profile.id} />
        </TabsContent>

        <TabsContent value="catalog">
          <GenericCatalogManager entityId={profile.id} />
        </TabsContent>

        <TabsContent value="video">
          <UnifiedVideoManager profileId={profile.id} />
        </TabsContent>

        <TabsContent value="more">
          <div className="space-y-6">
            <UnifiedSocialManager profileId={profile.id} />
            <UnifiedWhatsAppManager profileId={profile.id} />
            <GenericCertificationsManager entityId={profile.id} />
            <GenericJobVacanciesManager entityId={profile.id} />
            <GenericAppointmentsManager entityId={profile.id} />
            <GenericTestimonialsManager profileId={profile.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
