import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ImageUpload';
import { MediaUpload } from '@/components/MediaUpload';
import { CreatePostDialog } from '@/components/CreatePostDialog';
import { 
  ArrowLeft, Save, Star, MessageSquare, Plus, Trash2, 
  Facebook, Instagram, Linkedin, Twitter, Globe, MessageCircle, 
  AlertTriangle, Info, Image as ImageIcon, Users, MessagesSquare,
  Eye, EyeOff, ExternalLink, Upload, X, Briefcase, Zap, Play,
  ShoppingBag, ThumbsUp, Award, Calendar, Link as LinkIcon, Briefcase as BriefcaseIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BusinessBannersManager } from '@/components/business/BusinessBannersManager';
import { BusinessVideoManager } from '@/components/business/BusinessVideoManager';
import { BusinessCatalogManager } from '@/components/business/BusinessCatalogManager';
import { BusinessTestimonialsManager } from '@/components/business/BusinessTestimonialsManager';
import { BusinessCertificationsManager } from '@/components/business/BusinessCertificationsManager';
import { BusinessAppointmentsManager } from '@/components/business/BusinessAppointmentsManager';
import { BusinessLinktreeManager } from '@/components/business/BusinessLinktreeManager';
import { BusinessJobVacanciesManager } from '@/components/business/BusinessJobVacanciesManager';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar';

interface BusinessProfile {
  id: string;
  profile_id: string;
  company_name: string;
  slug: string;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  category: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  portfolio_description: string | null;
  whatsapp: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  website_url: string | null;
  enable_negotiation: boolean;
  working_hours: string | null;
  services_offered: string[] | null;
  active: boolean;
}

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  media_url: string;
  media_type: string;
}

interface BusinessPost {
  id: string;
  content: string;
  media_urls: string[] | null;
  media_types: string[] | null;
  created_at: string;
}

interface Evaluation {
  id: string;
  user_id: string;
  title: string;
  content: string;
  rating: number;
  public_response: string | null;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
  };
}

type Section = 'info' | 'company-data' | 'social' | 'portfolio' | 'posts' | 'evaluations' | 'features' | 'settings';

interface BusinessFeature {
  key: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  isActive: boolean;
}

export default function BusinessEdit() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [posts, setPosts] = useState<BusinessPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [responses, setResponses] = useState<{ [key: string]: string }>({});
  const [newPortfolioItem, setNewPortfolioItem] = useState({ title: '', description: '', url: '', type: '' });
  const [activeSection, setActiveSection] = useState<Section>('info');
  const [features, setFeatures] = useState<BusinessFeature[]>([]);
  
  // Refs para inputs de upload
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const menuItems = [
    { id: 'info' as Section, label: 'Personalização', icon: Info, color: 'text-blue-500' },
    { id: 'company-data' as Section, label: 'Dados da Empresa', icon: Briefcase, color: 'text-indigo-500' },
    { id: 'social' as Section, label: 'Redes Sociais', icon: Globe, color: 'text-purple-500' },
    { id: 'portfolio' as Section, label: 'Portfólio', icon: ImageIcon, color: 'text-green-500' },
    { id: 'posts' as Section, label: 'Posts', icon: MessagesSquare, color: 'text-orange-500' },
    { id: 'evaluations' as Section, label: 'Avaliações', icon: Users, color: 'text-pink-500' },
    { id: 'features' as Section, label: 'Ferramentas do Perfil', icon: Zap, color: 'text-yellow-500' },
    { id: 'settings' as Section, label: 'Configurações', icon: AlertTriangle, color: 'text-red-500' },
  ];

  const availableFeatures: Omit<BusinessFeature, 'isActive'>[] = [
    {
      key: 'banner',
      name: 'Banner Rotativo',
      description: 'Até 5 banners rotativos no topo do perfil',
      icon: ImageIcon,
      color: 'bg-gradient-to-br from-blue-500 to-cyan-500'
    },
    {
      key: 'video',
      name: 'Vídeo de Apresentação',
      description: 'Vídeo do YouTube no topo do perfil',
      icon: Play,
      color: 'bg-gradient-to-br from-red-500 to-pink-500'
    },
    {
      key: 'catalog',
      name: 'Catálogo de Serviços',
      description: 'Venda produtos e serviços diretamente',
      icon: ShoppingBag,
      color: 'bg-gradient-to-br from-green-500 to-emerald-500'
    },
    {
      key: 'testimonials',
      name: 'Depoimentos',
      description: 'Área para clientes deixarem avaliações',
      icon: ThumbsUp,
      color: 'bg-gradient-to-br from-purple-500 to-violet-500'
    },
    {
      key: 'certifications',
      name: 'Certificações e Prêmios',
      description: 'Mostre seus certificados e conquistas',
      icon: Award,
      color: 'bg-gradient-to-br from-amber-500 to-orange-500'
    },
    {
      key: 'appointments',
      name: 'Agendamento',
      description: 'Sistema de agendamento integrado',
      icon: Calendar,
      color: 'bg-gradient-to-br from-indigo-500 to-blue-500'
    },
    {
      key: 'linktree',
      name: 'LinkTree Personalizado',
      description: 'Múltiplos links externos personalizados',
      icon: LinkIcon,
      color: 'bg-gradient-to-br from-teal-500 to-cyan-500'
    },
    {
      key: 'vacancies',
      name: 'Vagas de Emprego',
      description: 'Publique e gerencie vagas de trabalho',
      icon: BriefcaseIcon,
      color: 'bg-gradient-to-br from-pink-500 to-rose-500'
    }
  ];

  useEffect(() => {
    loadBusiness();
    loadEvaluations();
  }, [slug]);

  useEffect(() => {
    if (business?.id) {
      loadPortfolio();
      loadPosts();
      loadFeatures();
    }
  }, [business?.id]);

  const loadBusiness = async () => {
    if (!user || !slug) return;

    const { data: profileData } = await supabase
      .from('profiles' as any)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profileData) return;

    const { data, error } = await supabase
      .from('business_profiles' as any)
      .select('*')
      .eq('slug', slug)
      .eq('profile_id', (profileData as any).id)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: 'Erro',
        description: 'Perfil não encontrado',
        variant: 'destructive',
      });
      navigate('/painel');
      return;
    }

    setBusiness(data as unknown as BusinessProfile);
    setLoading(false);
  };

  const loadEvaluations = async () => {
    if (!slug) return;

    const { data: businessData } = await supabase
      .from('business_profiles' as any)
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!businessData) return;

    const { data: evaluationsData } = await supabase
      .from('evaluations' as any)
      .select('id, title, content, rating, created_at, public_response, user_id')
      .eq('business_id', (businessData as any).id)
      .order('created_at', { ascending: false });

    if (evaluationsData) {
      const userIds = evaluationsData.map((e: any) => e.user_id);
      const { data: profilesData } = await supabase
        .from('profiles' as any)
        .select('user_id, username, full_name')
        .in('user_id', userIds);

      const evaluationsWithProfiles = evaluationsData.map((evaluation: any) => {
        const profile = profilesData?.find((p: any) => p.user_id === evaluation.user_id);
        return {
          ...evaluation,
          profiles: profile || { username: 'unknown', full_name: 'Unknown User' }
        };
      });

      setEvaluations(evaluationsWithProfiles as any);
    }
  };

  const loadPortfolio = async () => {
    if (!business?.id) return;

    const { data } = await supabase
      .from('portfolio_items' as any)
      .select('*')
      .eq('business_id', business.id)
      .order('order_index', { ascending: true });

    if (data) {
      setPortfolio(data as any);
    }
  };

  const loadPosts = async () => {
    if (!business?.id) return;

    const { data } = await supabase
      .from('business_posts' as any)
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (data) {
      setPosts(data as any);
    }
  };

  const loadFeatures = async () => {
    if (!business?.id) return;

    const { data } = await supabase
      .from('business_profile_features' as any)
      .select('*')
      .eq('business_id', business.id);

    const featuresMap = new Map(data?.map((f: any) => [f.feature_key, f.is_active]) || []);
    
    const allFeatures = availableFeatures.map(f => ({
      ...f,
      isActive: featuresMap.get(f.key) || false
    }));

    setFeatures(allFeatures);
  };

  const handleToggleFeature = async (featureKey: string) => {
    if (!business?.id) return;

    const feature = features.find(f => f.key === featureKey);
    if (!feature) return;

    const newActiveState = !feature.isActive;

    const { error } = await supabase
      .from('business_profile_features' as any)
      .upsert({
        business_id: business.id,
        feature_key: featureKey,
        is_active: newActiveState,
        settings: {}
      }, {
        onConflict: 'business_id,feature_key'
      });

    if (!error) {
      setFeatures(features.map(f => 
        f.key === featureKey ? { ...f, isActive: newActiveState } : f
      ));
      toast({
        title: newActiveState ? 'Ferramenta ativada!' : 'Ferramenta desativada',
        description: `${feature.name} foi ${newActiveState ? 'ativada' : 'desativada'} com sucesso.`
      });
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a ferramenta',
        variant: 'destructive'
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('business_profiles' as any)
        .update({
          company_name: business.company_name,
          description: business.description,
          category: business.category,
          phone: business.phone,
          email: business.email,
          address: business.address,
          portfolio_description: business.portfolio_description,
          whatsapp: business.whatsapp,
          facebook: business.facebook,
          instagram: business.instagram,
          linkedin: business.linkedin,
          twitter: business.twitter,
          website_url: business.website_url,
          enable_negotiation: business.enable_negotiation,
          working_hours: business.working_hours,
          services_offered: business.services_offered,
          active: business.active,
        })
        .eq('id', business.id);

      if (error) throw error;

      toast({
        title: 'Salvo!',
        description: 'Alterações salvas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (url: string) => {
    if (!business) return;

    const { error } = await supabase
      .from('business_profiles' as any)
      .update({ logo_url: url })
      .eq('id', business.id);

    if (!error) {
      setBusiness({ ...business, logo_url: url });
      toast({ title: 'Logo atualizado!' });
    }
  };

  const handleCoverUpload = async (url: string) => {
    if (!business) return;

    const { error } = await supabase
      .from('business_profiles' as any)
      .update({ cover_url: url })
      .eq('id', business.id);

    if (!error) {
      setBusiness({ ...business, cover_url: url });
      toast({ title: 'Capa atualizada!' });
    }
  };
  
  const handleLogoDelete = async () => {
    if (!business) return;

    const { error } = await supabase
      .from('business_profiles' as any)
      .update({ logo_url: null })
      .eq('id', business.id);

    if (!error) {
      setBusiness({ ...business, logo_url: null });
      toast({ title: 'Logo removido!' });
    }
  };

  const handleCoverDelete = async () => {
    if (!business) return;

    const { error } = await supabase
      .from('business_profiles' as any)
      .update({ cover_url: null })
      .eq('id', business.id);

    if (!error) {
      setBusiness({ ...business, cover_url: null });
      toast({ title: 'Capa removida!' });
    }
  };

  const handleResponseSubmit = async (evaluationId: string) => {
    const response = responses[evaluationId];
    if (!response?.trim()) return;

    try {
      const { error } = await supabase
        .from('evaluations' as any)
        .update({ public_response: response })
        .eq('id', evaluationId);

      if (error) throw error;

      toast({
        title: 'Resposta publicada!',
        description: 'Sua resposta foi enviada.',
      });

      setResponses({ ...responses, [evaluationId]: '' });
      loadEvaluations();
    } catch (error: any) {
      toast({
        title: 'Erro ao responder',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAddPortfolioItem = async () => {
    if (!business || !newPortfolioItem.title || !newPortfolioItem.url) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha título e adicione uma mídia',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('portfolio_items' as any)
        .insert({
          business_id: business.id,
          title: newPortfolioItem.title,
          description: newPortfolioItem.description,
          media_url: newPortfolioItem.url,
          media_type: newPortfolioItem.type,
          order_index: portfolio.length,
        });

      if (error) throw error;

      toast({ title: 'Item adicionado ao portfólio!' });
      setNewPortfolioItem({ title: '', description: '', url: '', type: '' });
      loadPortfolio();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar item',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeletePortfolioItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_items' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Item removido do portfólio' });
      loadPortfolio();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover item',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      const { error } = await supabase
        .from('business_posts' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Post removido' });
      loadPosts();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover post',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async () => {
    if (!business) return;

    const newActive = !business.active;
    
    try {
      const { error } = await supabase
        .from('business_profiles' as any)
        .update({ active: newActive })
        .eq('id', business.id);

      if (error) throw error;

      setBusiness({ ...business, active: newActive });
      toast({
        title: newActive ? 'Perfil ativado!' : 'Perfil desativado',
        description: newActive 
          ? 'Seu perfil profissional está visível novamente.' 
          : 'Seu perfil profissional foi ocultado.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProfile = async () => {
    if (!business) return;

    try {
      const { error } = await supabase
        .from('business_profiles' as any)
        .delete()
        .eq('id', business.id);

      if (error) throw error;

      toast({
        title: 'Perfil profissional excluído',
        description: 'Seu perfil profissional foi removido com sucesso.',
      });
      
      navigate('/painel');
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir perfil',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!business) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      
      <SidebarProvider>
        <div className="flex w-full min-h-[calc(100vh-64px)] relative">
          {/* Sidebar */}
          <Sidebar className="border-r bg-card/50 backdrop-blur-sm z-10" style={{ top: '64px', height: 'calc(100svh - 64px)' }}>
            <SidebarContent>
              <div className="p-4 border-b space-y-3">
                <h2 className="text-lg font-bold px-2">Perfil Profissional</h2>
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold">{business.company_name}</h1>
                    {business.active ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <Eye className="w-4 h-4" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        <EyeOff className="w-4 h-4" />
                        Desativado
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/${business.slug}`, '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver Perfil
                  </Button>
                </div>
                <p className="text-muted-foreground">@{business.slug}</p>
              </div>

              {/* Personalização */}
              {activeSection === 'info' && (
                <div className="space-y-6 animate-fade-in">
                  <Card className="bg-card/50 backdrop-blur-sm border-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-blue-600">
                        <ImageIcon className="w-5 h-5" />
                        Personalize seu perfil
                      </CardTitle>
                      <CardDescription>Ferramentas para deixar seu perfil incrível</CardDescription>
                    </div>
                    <CardContent className="p-6 space-y-6">
                      {/* Inputs de upload escondidos */}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Dispatch event para o ImageUpload component processar
                            const imageUpload = document.querySelector('[data-upload-type="logo"]');
                            if (imageUpload) {
                              const input = imageUpload.querySelector('input[type="file"]') as HTMLInputElement;
                              if (input) {
                                const dataTransfer = new DataTransfer();
                                dataTransfer.items.add(file);
                                input.files = dataTransfer.files;
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                              }
                            }
                          }
                        }}
                      />
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Dispatch event para o ImageUpload component processar
                            const imageUpload = document.querySelector('[data-upload-type="cover"]');
                            if (imageUpload) {
                              const input = imageUpload.querySelector('input[type="file"]') as HTMLInputElement;
                              if (input) {
                                const dataTransfer = new DataTransfer();
                                dataTransfer.items.add(file);
                                input.files = dataTransfer.files;
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                              }
                            }
                          }
                        }}
                      />
                      
                      {/* Prévia do Perfil */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Prévia do Perfil</Label>
                        <div className="relative w-full rounded-lg overflow-visible border-2 border-border bg-background">
                          {/* Capa */}
                          <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                            {business.cover_url ? (
                              <img 
                                src={business.cover_url} 
                                alt="Capa" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                            )}
                            
                            {/* Botões de editar e deletar capa */}
                            <div className="absolute top-2 right-2 flex gap-2">
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full shadow-lg bg-green-500 hover:bg-green-600 text-white"
                                onClick={() => coverInputRef.current?.click()}
                                title="Alterar capa"
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                              {business.cover_url && (
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  className="h-8 w-8 rounded-full shadow-lg"
                                  onClick={handleCoverDelete}
                                  title="Remover capa"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Container do logo e nome */}
                          <div className="relative px-4 pb-4">
                            {/* Logo posicionado no canto */}
                            <div className="absolute -top-12 left-4">
                              <div className="relative w-32 h-32 rounded-xl border-4 border-background overflow-hidden bg-background shadow-xl">
                                {business.logo_url ? (
                                  <img 
                                    src={business.logo_url} 
                                    alt="Logo" 
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-muted flex items-center justify-center">
                                    <ImageIcon className="w-10 h-10 text-muted-foreground" />
                                  </div>
                                )}
                                {/* Botões de editar e deletar logo */}
                                <div className="absolute bottom-1 right-1 flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="h-7 w-7 rounded-full shadow-lg bg-green-500 hover:bg-green-600 text-white"
                                    onClick={() => logoInputRef.current?.click()}
                                    title="Alterar logo"
                                  >
                                    <Upload className="h-3 w-3" />
                                  </Button>
                                  {business.logo_url && (
                                    <Button
                                      size="icon"
                                      variant="destructive"
                                      className="h-7 w-7 rounded-full shadow-lg"
                                      onClick={handleLogoDelete}
                                      title="Remover logo"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Nome da empresa à esquerda, após o logo */}
                            <div className="pt-6 pl-40">
                              <div className="inline-block bg-background/95 backdrop-blur-sm px-6 py-2 rounded-lg shadow-sm border">
                                <h2 className="text-2xl font-bold whitespace-nowrap">
                                  {business.company_name}
                                </h2>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          Esta é uma prévia de como seu perfil aparecerá para os visitantes
                        </p>
                      </div>
                      
                      {/* Componentes de upload escondidos para processar as imagens */}
                      <div className="hidden">
                        <div data-upload-type="logo">
                          <ImageUpload
                            currentImageUrl={business.logo_url}
                            onUpload={handleLogoUpload}
                            bucket="business-logos"
                            folder={business.id}
                            type="logo"
                          />
                        </div>
                        <div data-upload-type="cover">
                          <ImageUpload
                            currentImageUrl={business.cover_url}
                            onUpload={handleCoverUpload}
                            bucket="business-covers"
                            folder={business.id}
                            type="cover"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Dados da Empresa */}
              {activeSection === 'company-data' && (
                <div className="animate-fade-in">
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-cyan-500/10 p-6 border-b">
                      <CardTitle className="text-indigo-600">Dados da Empresa</CardTitle>
                      <CardDescription>Informações básicas do seu negócio</CardDescription>
                    </div>
                    <CardContent className="p-6">
                      <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-base font-medium">Nome da Empresa</Label>
                          <Input
                            value={business.company_name}
                            onChange={(e) => setBusiness({ ...business, company_name: e.target.value })}
                            className="text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-base font-medium">Categoria</Label>
                          <Input
                            value={business.category || ''}
                            onChange={(e) => setBusiness({ ...business, category: e.target.value })}
                            placeholder="Ex: Tecnologia, Alimentação, etc"
                            className="text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-base font-medium">Descrição</Label>
                          <Textarea
                            value={business.description || ''}
                            onChange={(e) => setBusiness({ ...business, description: e.target.value })}
                            rows={4}
                            placeholder="Descreva sua empresa..."
                            className="text-base resize-none"
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-base font-medium">Email</Label>
                            <Input
                              type="email"
                              value={business.email || ''}
                              onChange={(e) => setBusiness({ ...business, email: e.target.value })}
                              placeholder="contato@empresa.com"
                              className="text-base"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-base font-medium">Telefone</Label>
                            <Input
                              value={business.phone || ''}
                              onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                              placeholder="(00) 00000-0000"
                              className="text-base"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-base font-medium">Endereço</Label>
                          <Input
                            value={business.address || ''}
                            onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                            placeholder="Endereço completo"
                            className="text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-base font-medium">Horário de Funcionamento</Label>
                          <Input
                            value={business.working_hours || ''}
                            onChange={(e) => setBusiness({ ...business, working_hours: e.target.value })}
                            placeholder="Ex: Seg-Sex: 9h-18h"
                            className="text-base"
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 border-2 rounded-lg bg-muted/30">
                          <div className="space-y-0.5">
                            <Label className="text-base font-medium">Ativar Negociação</Label>
                            <p className="text-sm text-muted-foreground">
                              Permitir que clientes negociem diretamente com você
                            </p>
                          </div>
                          <Switch
                            checked={business.enable_negotiation}
                            onCheckedChange={(checked) => setBusiness({ ...business, enable_negotiation: checked })}
                          />
                        </div>
                        <Button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:shadow-lg transition-all text-base py-6" disabled={saving}>
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
                <div className="animate-fade-in">
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-purple-600">
                        <Globe className="w-5 h-5" />
                        Redes Sociais
                      </CardTitle>
                      <CardDescription>Links para suas redes sociais e site</CardDescription>
                    </div>
                    <CardContent className="p-6">
                      <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-base font-medium">
                            <MessageCircle className="w-4 h-4 text-green-500" />
                            WhatsApp
                          </Label>
                          <Input
                            value={business.whatsapp || ''}
                            onChange={(e) => setBusiness({ ...business, whatsapp: e.target.value })}
                            placeholder="5511999999999"
                            className="text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-base font-medium">
                            <Facebook className="w-4 h-4 text-blue-600" />
                            Facebook
                          </Label>
                          <Input
                            value={business.facebook || ''}
                            onChange={(e) => setBusiness({ ...business, facebook: e.target.value })}
                            placeholder="https://facebook.com/..."
                            className="text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-base font-medium">
                            <Instagram className="w-4 h-4 text-pink-500" />
                            Instagram
                          </Label>
                          <Input
                            value={business.instagram || ''}
                            onChange={(e) => setBusiness({ ...business, instagram: e.target.value })}
                            placeholder="https://instagram.com/..."
                            className="text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-base font-medium">
                            <Linkedin className="w-4 h-4 text-blue-700" />
                            LinkedIn
                          </Label>
                          <Input
                            value={business.linkedin || ''}
                            onChange={(e) => setBusiness({ ...business, linkedin: e.target.value })}
                            placeholder="https://linkedin.com/company/..."
                            className="text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-base font-medium">
                            <Twitter className="w-4 h-4 text-blue-400" />
                            Twitter/X
                          </Label>
                          <Input
                            value={business.twitter || ''}
                            onChange={(e) => setBusiness({ ...business, twitter: e.target.value })}
                            placeholder="https://twitter.com/..."
                            className="text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-base font-medium">
                            <Globe className="w-4 h-4 text-indigo-500" />
                            Website
                          </Label>
                          <Input
                            value={business.website_url || ''}
                            onChange={(e) => setBusiness({ ...business, website_url: e.target.value })}
                            placeholder="https://seusite.com"
                            className="text-base"
                          />
                        </div>
                        <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg transition-all text-base py-6" disabled={saving}>
                          <Save className="w-5 h-5 mr-2" />
                          {saving ? 'Salvando...' : 'Salvar Redes Sociais'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Portfólio */}
              {activeSection === 'portfolio' && (
                <div className="space-y-6 animate-fade-in">
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-green-600">
                        <ImageIcon className="w-5 h-5" />
                        Adicionar ao Portfólio
                      </CardTitle>
                      <CardDescription>Imagens e vídeos dos seus trabalhos</CardDescription>
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-base font-medium">Título</Label>
                        <Input
                          value={newPortfolioItem.title}
                          onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })}
                          placeholder="Nome do projeto"
                          className="text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-base font-medium">Descrição</Label>
                        <Textarea
                          value={newPortfolioItem.description}
                          onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, description: e.target.value })}
                          placeholder="Descreva o projeto..."
                          rows={3}
                          className="text-base resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-base font-medium">Mídia</Label>
                        <MediaUpload
                          onUpload={(url, type) => setNewPortfolioItem({ ...newPortfolioItem, url, type })}
                        />
                      </div>
                      <Button
                        onClick={handleAddPortfolioItem}
                        className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:shadow-lg text-base py-6"
                        disabled={!newPortfolioItem.title || !newPortfolioItem.url}
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Adicionar ao Portfólio
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-6 border-b">
                      <CardTitle className="text-green-600">Itens do Portfólio ({portfolio.length})</CardTitle>
                    </div>
                    <CardContent className="p-6">
                      {portfolio.length === 0 ? (
                        <div className="text-center py-12">
                          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">Nenhum item no portfólio ainda</p>
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                          {portfolio.map((item) => (
                            <div key={item.id} className="relative group border-2 rounded-lg overflow-hidden hover:shadow-lg transition-all">
                              {item.media_type === 'image' ? (
                                <img src={item.media_url} alt={item.title} className="w-full h-48 object-cover" />
                              ) : (
                                <video src={item.media_url} className="w-full h-48 object-cover" />
                              )}
                              <div className="p-3 bg-card">
                                <h4 className="font-medium">{item.title}</h4>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                                )}
                              </div>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                onClick={() => handleDeletePortfolioItem(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Posts */}
              {activeSection === 'posts' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-end">
                    <CreatePostDialog businessId={business.id} onPostCreated={loadPosts} />
                  </div>

                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-orange-600">
                        <MessagesSquare className="w-5 h-5" />
                        Seus Posts ({posts.length})
                      </CardTitle>
                    </div>
                    <CardContent className="p-6">
                      {posts.length === 0 ? (
                        <div className="text-center py-12">
                          <MessagesSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">Nenhum post publicado ainda</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {posts.map((post) => (
                            <div key={post.id} className="border-2 rounded-lg p-4 space-y-3 hover:shadow-md transition-all">
                              <div className="flex justify-between items-start">
                                <p className="text-sm text-muted-foreground">
                                  {new Date(post.created_at).toLocaleDateString('pt-BR')}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeletePost(post.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                              <p className="whitespace-pre-wrap text-base">{post.content}</p>
                              {post.media_urls && post.media_urls.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                  {post.media_urls.map((url, i) => (
                                    post.media_types?.[i] === 'image' ? (
                                      <img key={i} src={url} alt="" className="w-full h-32 object-cover rounded-lg" />
                                    ) : (
                                      <video key={i} src={url} controls className="w-full h-32 rounded-lg" />
                                    )
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Avaliações */}
              {activeSection === 'evaluations' && (
                <div className="animate-fade-in">
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-purple-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-pink-600">
                        <Users className="w-5 h-5" />
                        Avaliações ({evaluations.length})
                      </CardTitle>
                      <CardDescription>Gerencie as avaliações da sua marca</CardDescription>
                    </div>
                    <CardContent className="p-6">
                      {evaluations.length === 0 ? (
                        <div className="text-center py-12">
                          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">Nenhuma avaliação ainda</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {evaluations.map((evaluation) => (
                            <div key={evaluation.id} className="border-2 rounded-lg p-4 space-y-3 hover:shadow-md transition-all">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-base">{evaluation.profiles.full_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    @{evaluation.profiles.username}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
                                  <Star className="w-4 h-4 fill-primary text-primary" />
                                  <span className="font-bold text-primary">{evaluation.rating}</span>
                                </div>
                              </div>
                              <div>
                                <p className="font-medium mb-1 text-base">{evaluation.title}</p>
                                <p className="text-sm text-muted-foreground">{evaluation.content}</p>
                              </div>
                              {evaluation.public_response ? (
                                <div className="bg-muted/50 rounded-lg p-3 border">
                                  <p className="text-sm font-medium mb-1 text-primary">Sua resposta:</p>
                                  <p className="text-sm">{evaluation.public_response}</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Textarea
                                    placeholder="Responder avaliação..."
                                    value={responses[evaluation.id] || ''}
                                    onChange={(e) => setResponses({ ...responses, [evaluation.id]: e.target.value })}
                                    rows={2}
                                    className="text-base resize-none"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleResponseSubmit(evaluation.id)}
                                    disabled={!responses[evaluation.id]?.trim()}
                                    className="bg-gradient-to-r from-pink-500 to-purple-500"
                                  >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Responder
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Ferramentas do Perfil */}
              {activeSection === 'features' && (
                <div className="animate-fade-in space-y-6">
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                        <Zap className="w-5 h-5" />
                        Ferramentas do Perfil
                      </CardTitle>
                      <CardDescription>
                        Ative ou desative funcionalidades interativas para seu perfil profissional
                      </CardDescription>
                    </div>
                    <CardContent className="p-6">
                      {/* Ferramentas ativas */}
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold mb-4">Ferramentas Ativas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {features.filter(f => f.isActive).map((feature) => {
                            const Icon = feature.icon;
                            return (
                              <div
                                key={feature.key}
                                className={`relative rounded-lg p-6 ${feature.color} text-white transition-all hover:shadow-lg cursor-pointer group`}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <Icon className="w-8 h-8" />
                                  <Switch
                                    checked={feature.isActive}
                                    onCheckedChange={() => handleToggleFeature(feature.key)}
                                    className="data-[state=checked]:bg-white/30"
                                  />
                                </div>
                                <h4 className="font-bold text-lg mb-1">{feature.name}</h4>
                                <p className="text-sm text-white/90">{feature.description}</p>
                              </div>
                            );
                          })}
                        </div>
                        {features.filter(f => f.isActive).length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Nenhuma ferramenta ativada ainda</p>
                          </div>
                        )}
                      </div>

                      {/* Ferramentas disponíveis */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Ferramentas Disponíveis</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {features.filter(f => !f.isActive).map((feature) => {
                            const Icon = feature.icon;
                            return (
                              <div
                                key={feature.key}
                                className="relative rounded-lg p-6 bg-muted/50 border-2 hover:border-primary/50 transition-all hover:shadow-md cursor-pointer group"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <Icon className="w-8 h-8 text-muted-foreground" />
                                  <Switch
                                    checked={feature.isActive}
                                    onCheckedChange={() => handleToggleFeature(feature.key)}
                                  />
                                </div>
                                <h4 className="font-bold text-lg mb-1">{feature.name}</h4>
                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Gerenciamento detalhado de cada ferramenta ativa */}
                  {features.some(f => f.isActive) && (
                    <div className="space-y-6">
                      {features.find(f => f.key === 'banner' && f.isActive) && (
                        <BusinessBannersManager businessId={business.id} />
                      )}

                      {features.find(f => f.key === 'video' && f.isActive) && (
                        <BusinessVideoManager businessId={business.id} />
                      )}

                      {features.find(f => f.key === 'catalog' && f.isActive) && (
                        <BusinessCatalogManager businessId={business.id} />
                      )}

                      {features.find(f => f.key === 'testimonials' && f.isActive) && (
                        <BusinessTestimonialsManager businessId={business.id} />
                      )}

                      {features.find(f => f.key === 'certifications' && f.isActive) && (
                        <BusinessCertificationsManager businessId={business.id} />
                      )}

                      {features.find(f => f.key === 'appointments' && f.isActive) && (
                        <BusinessAppointmentsManager businessId={business.id} />
                      )}

                      {features.find(f => f.key === 'linktree' && f.isActive) && (
                        <BusinessLinktreeManager businessId={business.id} />
                      )}

                      {features.find(f => f.key === 'vacancies' && f.isActive) && (
                        <BusinessJobVacanciesManager businessId={business.id} />
                      )}
                    </div>
                  )}

                  {/* Info sobre ferramentas */}
                  <Card className="bg-card/50 backdrop-blur-sm border-2 border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                          <Info className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Sobre as Ferramentas</h4>
                          <p className="text-sm text-muted-foreground">
                            As ferramentas ativas aparecerão no seu perfil público e no menu lateral.
                            Você pode ativar ou desativar qualquer ferramenta a qualquer momento.
                            Cada ferramenta oferece funcionalidades específicas para engajar seus clientes
                            e melhorar a experiência no seu perfil profissional.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Configurações/Zona de Perigo */}
              {activeSection === 'settings' && (
                <div className="space-y-6 animate-fade-in">
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-amber-600">
                        <Eye className="w-5 h-5" />
                        Visibilidade do Perfil
                      </CardTitle>
                      <CardDescription>
                        Controle se seu perfil está visível para outros usuários
                      </CardDescription>
                    </div>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between p-4 border-2 rounded-lg bg-muted/30">
                        <div className="space-y-0.5">
                          <Label className="text-base font-medium">
                            {business.active ? 'Perfil Ativo' : 'Perfil Desativado'}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {business.active 
                              ? 'Seu perfil está visível para todos' 
                              : 'Seu perfil está oculto e não aparece nas buscas'
                            }
                          </p>
                        </div>
                        <Switch
                          checked={business.active}
                          onCheckedChange={handleToggleActive}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border-2 border-destructive/50">
                    <div className="bg-gradient-to-r from-red-500/10 via-rose-500/10 to-pink-500/10 p-6 border-b border-destructive/20">
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Zona de Perigo
                      </CardTitle>
                      <CardDescription>
                        Ações irreversíveis do perfil profissional
                      </CardDescription>
                    </div>
                    <CardContent className="p-6">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full text-base py-6">
                            <Trash2 className="w-5 h-5 mr-2" />
                            Excluir Perfil Profissional Permanentemente
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <p>Esta ação não pode ser desfeita. Isso excluirá permanentemente seu perfil profissional, 
                              incluindo todos os posts, portfólio e avaliações associadas.</p>
                              <p className="font-medium text-foreground">Nota: Seu perfil de interações na plataforma não será afetado.</p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleDeleteProfile}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Sim, excluir perfil profissional
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
