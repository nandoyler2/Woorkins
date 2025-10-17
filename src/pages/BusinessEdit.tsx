import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
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
  ArrowLeft, Save, Star, MessageSquare, Plus, Trash2, Shield,
  Facebook, Instagram, Linkedin, Twitter, Globe, MessageCircle,
  AlertTriangle, Info, Image as ImageIcon, Users, MessagesSquare,
  Eye, EyeOff, ExternalLink, Upload, X, Briefcase, Zap, Play,
  ShoppingBag, ThumbsUp, Award, Calendar, Link as LinkIcon, Briefcase as BriefcaseIcon, Building2,
  Heart, Share2, MessageCircleMore
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
import BusinessAdministrators from './BusinessAdministrators';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  average_rating: number;
  total_reviews: number;
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

interface PostComment {
  id: string;
  post_id: string;
  profile_id: string;
  content: string;
  created_at: string;
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface PostLike {
  id: string;
  post_id: string;
  profile_id: string;
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

type Section = 'dashboard' | 'profile-cover' | 'tools' | 'posts' | 'evaluations' | 'settings' | 'admin' | 'info';

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
  const { openWithMessage } = useAIAssistant();
  
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [posts, setPosts] = useState<BusinessPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [responses, setResponses] = useState<{ [key: string]: string }>({});
  const [newPortfolioItem, setNewPortfolioItem] = useState({ title: '', description: '', url: '', type: '' });
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [features, setFeatures] = useState<BusinessFeature[]>([]);
  const [configuringFeature, setConfiguringFeature] = useState<string | null>(null);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState('');
  const [postExpanded, setPostExpanded] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharePostUrl, setSharePostUrl] = useState('');
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [postComments, setPostComments] = useState<{ [key: string]: PostComment[] }>({});
  const [postLikes, setPostLikes] = useState<{ [key: string]: PostLike[] }>({});
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [profileViews, setProfileViews] = useState<number>(0);
  const [viewsLastWeek, setViewsLastWeek] = useState<number>(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Refs para inputs de upload
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const menuItems = [
    { id: 'dashboard' as Section, label: 'Dashboard', icon: Building2, color: 'text-blue-500' },
    { id: 'posts' as Section, label: 'Posts', icon: MessagesSquare, color: 'text-orange-500' },
    { id: 'evaluations' as Section, label: 'Avaliações', icon: Users, color: 'text-pink-500' },
  ];

  const customizationItems = [
    { id: 'tools' as Section, label: 'Ferramentas', icon: Zap, color: 'text-yellow-500' },
    { id: 'profile-cover' as Section, label: 'Perfil e Capa', icon: Eye, color: 'text-blue-500' },
    { id: 'info' as Section, label: 'Informações', icon: Info, color: 'text-indigo-500' },
  ];

  const adminItems = [
    { id: 'admin' as Section, label: 'Administradores', icon: Shield, color: 'text-purple-500' },
    { id: 'settings' as Section, label: 'Configurações', icon: AlertTriangle, color: 'text-red-500' },
  ];

  const availableFeatures: Omit<BusinessFeature, 'isActive'>[] = [
    {
      key: 'negotiation',
      name: 'Negociação',
      description: 'Sistema de negociação com clientes',
      icon: MessageSquare,
      color: 'bg-gradient-to-br from-emerald-500 to-teal-500'
    },
    {
      key: 'social',
      name: 'Redes Sociais',
      description: 'Links para suas redes sociais e contatos',
      icon: Globe,
      color: 'bg-gradient-to-br from-purple-500 to-pink-500'
    },
    {
      key: 'portfolio',
      name: 'Portfólio',
      description: 'Galeria de trabalhos e projetos realizados',
      icon: ImageIcon,
      color: 'bg-gradient-to-br from-green-500 to-teal-500'
    },
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
    loadCurrentProfile();
  }, [slug]);

  useEffect(() => {
    if (business?.id) {
      loadPortfolio();
      loadPosts();
      loadFeatures();
      loadProfileViews();
    }
  }, [business?.id]);

  const loadCurrentProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles' as any)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setCurrentProfileId((data as any).id);
    }
  };

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
      // Carregar comentários e curtidas para cada post
      data.forEach((post: any) => {
        loadPostComments(post.id);
        loadPostLikes(post.id);
      });
    }
  };

  const loadPostComments = async (postId: string) => {
    const { data: commentsData } = await supabase
      .from('business_post_comments' as any)
      .select('id, post_id, profile_id, content, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (commentsData && commentsData.length > 0) {
      // Buscar perfis dos comentadores
      const profileIds = commentsData.map((c: any) => c.profile_id);
      const { data: profilesData } = await supabase
        .from('profiles' as any)
        .select('id, full_name, avatar_url')
        .in('id', profileIds);

      // Mapear comentários com perfis
      const comments = commentsData.map((comment: any) => {
        const profile = profilesData?.find((p: any) => p.id === comment.profile_id);
        return {
          ...comment,
          profile: profile || { full_name: 'Usuário', avatar_url: null }
        };
      });
      
      setPostComments(prev => ({ ...prev, [postId]: comments }));
    } else {
      setPostComments(prev => ({ ...prev, [postId]: [] }));
    }
  };

  const loadPostLikes = async (postId: string) => {
    const { data } = await supabase
      .from('business_post_likes' as any)
      .select('id, post_id, profile_id')
      .eq('post_id', postId);

    if (data) {
      setPostLikes(prev => ({ ...prev, [postId]: data as any }));
    } else {
      setPostLikes(prev => ({ ...prev, [postId]: [] }));
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!currentProfileId) return;

    const currentLikes = postLikes[postId] || [];
    const isLiked = currentLikes.some(like => like.profile_id === currentProfileId);

    if (isLiked) {
      // Remove like
      const { error } = await supabase
        .from('business_post_likes' as any)
        .delete()
        .eq('post_id', postId)
        .eq('profile_id', currentProfileId);

      if (!error) {
        loadPostLikes(postId);
      }
    } else {
      // Add like
      const { error } = await supabase
        .from('business_post_likes' as any)
        .insert({
          post_id: postId,
          profile_id: currentProfileId
        });

      if (!error) {
        loadPostLikes(postId);
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!currentProfileId || !commentText[postId]?.trim()) return;

    const { error } = await supabase
      .from('business_post_comments' as any)
      .insert({
        post_id: postId,
        profile_id: currentProfileId,
        content: commentText[postId].trim()
      });

    if (!error) {
      toast({
        title: 'Comentário publicado!',
        description: 'Seu comentário foi adicionado ao post.',
      });
      setCommentText({ ...commentText, [postId]: '' });
      loadPostComments(postId);
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o comentário.',
        variant: 'destructive'
      });
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
      // Para negotiation, sincronizar com enable_negotiation do business
      isActive: f.key === 'negotiation' 
        ? business.enable_negotiation || false
        : featuresMap.get(f.key) || false
    }));

    // Ordenar: ativas primeiro
    allFeatures.sort((a, b) => {
      if (a.isActive === b.isActive) return 0;
      return a.isActive ? -1 : 1;
    });

    setFeatures(allFeatures);
  };

  const loadProfileViews = async () => {
    if (!business?.id) return;

    // Total de visualizações
    const { count: totalViews } = await supabase
      .from('business_profile_views' as any)
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id);

    // Visualizações da última semana
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { count: weekViews } = await supabase
      .from('business_profile_views' as any)
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('viewed_at', oneWeekAgo.toISOString());

    setProfileViews(totalViews || 0);
    setViewsLastWeek(weekViews || 0);
  };

  const handleToggleFeature = async (featureKey: string) => {
    if (!business?.id) return;

    const feature = features.find(f => f.key === featureKey);
    if (!feature) return;

    const newActiveState = !feature.isActive;

    // Atualizar estado local imediatamente
    setFeatures(prevFeatures => 
      prevFeatures.map(f => 
        f.key === featureKey ? { ...f, isActive: newActiveState } : f
      )
    );

    // Se ativou uma ferramenta, mudar para a seção de ferramentas
    if (newActiveState) {
      setActiveSection('tools');
    }

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

    // Se a feature é negotiation, atualizar também o campo enable_negotiation
    if (featureKey === 'negotiation') {
      await supabase
        .from('business_profiles' as any)
        .update({ enable_negotiation: newActiveState })
        .eq('id', business.id);
      
      setBusiness({ ...business, enable_negotiation: newActiveState });
    }

    if (!error) {
      toast({
        title: newActiveState ? 'Ferramenta ativada!' : 'Ferramenta desativada',
        description: `${feature.name} foi ${newActiveState ? 'ativada' : 'desativada'}.`
      });
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a ferramenta',
        variant: 'destructive'
      });
      // Reverter mudança em caso de erro
      loadFeatures();
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !business?.id) return;

    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${business.id}/${Date.now()}_${i}.${fileExt}`;

      try {
        const { data, error } = await supabase.storage
          .from('business-media')
          .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('business-media')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      } catch (error: any) {
        toast({
          title: 'Erro ao fazer upload',
          description: error.message,
          variant: 'destructive',
        });
      }
    }

    setPostImages([...postImages, ...uploadedUrls]);
  };

  const handleRemoveImage = (index: number) => {
    setPostImages(postImages.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && postImages.length === 0) {
      toast({
        title: 'Post vazio',
        description: 'Adicione texto ou imagem ao post',
        variant: 'destructive',
      });
      return;
    }

    setPosting(true);
    try {
      const { error } = await supabase
        .from('business_posts' as any)
        .insert({
          business_id: business?.id,
          content: postContent.trim(),
          media_urls: postImages.length > 0 ? postImages : null,
          media_types: postImages.length > 0 ? postImages.map(() => 'image') : null,
        });

      if (error) throw error;

      toast({
        title: 'Post publicado!',
        description: 'Seu post foi compartilhado.',
      });

      setPostContent('');
      setPostImages([]);
      setPostExpanded(false);
      loadPosts();
    } catch (error: any) {
      toast({
        title: 'Erro ao publicar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPosting(false);
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

  const confirmDeleteProfile = () => {
    if (!business?.slug) return;
    
    if (deleteConfirmSlug !== `@${business.slug}`) {
      toast({
        title: 'Erro',
        description: 'O @ digitado não corresponde ao perfil que deseja excluir.',
        variant: 'destructive',
      });
      return;
    }
    
    handleDeleteProfile();
  };

  const handleDeleteProfile = async () => {
    if (!business) return;

    try {
      // Soft delete - marca como deletado ao invés de apagar
      const { error } = await supabase
        .from('business_profiles')
        .update({
          deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id || null,
        })
        .eq('id', business.id);

      if (error) throw error;

      toast({
        title: 'Perfil profissional excluído',
        description: 'Seu perfil profissional foi removido com sucesso.',
      });
      
      setDeleteConfirmSlug('');
      
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
                            onClick={() => {
                              setActiveSection(item.id);
                              // Resetar ferramenta configurando quando clicar em Ferramentas
                              if (item.id === 'tools') {
                                setConfiguringFeature(null);
                              }
                            }}
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

            {/* Ferramentas Ativas */}
              {features.filter(f => f.isActive).length > 0 && (
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs text-muted-foreground px-2">
                    Ferramentas Ativas
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {features.filter(f => f.isActive).map((feature) => {
                        const Icon = feature.icon;
                        const isActive = configuringFeature === feature.key;
                        return (
                          <SidebarMenuItem key={feature.key}>
                            <SidebarMenuButton
                              onClick={() => {
                                setActiveSection('tools');
                                setConfiguringFeature(feature.key);
                              }}
                              className={`
                                ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'}
                                transition-all duration-200
                              `}
                            >
                              <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span>{feature.name}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Personalização section */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs text-muted-foreground px-2">
                Personalização
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {customizationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id && !configuringFeature;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => {
                            setActiveSection(item.id);
                            setConfiguringFeature(null);
                          }}
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

            {/* Admin - separate section */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs text-muted-foreground px-2">
                Administração
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => {
                            setActiveSection(item.id);
                            setConfiguringFeature(null);
                          }}
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

            {/* Botão de Ajuda */}
            {user && (
              <SidebarGroup className="mt-auto">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => openWithMessage('')}
                        className="hover:bg-muted/50 transition-all duration-200 text-sm py-2"
                      >
                        <MessageCircle className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">Precisa de ajuda?</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Final closing */}
          </SidebarContent>
        </Sidebar>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-6 py-8 max-w-5xl">
              {/* Header do perfil - não mostrar no dashboard */}
              {activeSection !== 'dashboard' && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {business.logo_url ? (
                        <img 
                          src={business.logo_url} 
                          alt={business.company_name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                          <Building2 className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h1 className="text-3xl font-bold">{business.company_name}</h1>
                        <p className="text-muted-foreground text-sm">@{business.slug}</p>
                      </div>
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
                </div>
              )}

              {/* Perfil e Capa */}
              {activeSection === 'profile-cover' && (
                <div className="animate-fade-in">
                  <Card className="bg-card/50 backdrop-blur-sm border-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-blue-600">
                        <Eye className="w-5 h-5" />
                        Perfil e Capa
                      </CardTitle>
                      <CardDescription>Personalize a aparência do seu perfil</CardDescription>
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
                          
                          <div className="relative px-4 pb-4">
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
                      
                      {/* Componentes de upload escondidos */}
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

              {/* Ferramentas */}
              {activeSection === 'tools' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Ferramentas Interativas */}
                  {configuringFeature ? (
                    <div className="space-y-6">
                      {configuringFeature === 'banner' && (
                        <BusinessBannersManager businessId={business.id} />
                      )}

                      {configuringFeature === 'video' && (
                        <BusinessVideoManager businessId={business.id} />
                      )}

                      {configuringFeature === 'catalog' && (
                        <BusinessCatalogManager businessId={business.id} />
                      )}

                      {configuringFeature === 'testimonials' && (
                        <BusinessTestimonialsManager businessId={business.id} />
                      )}

                      {configuringFeature === 'certifications' && (
                        <BusinessCertificationsManager businessId={business.id} />
                      )}

                      {configuringFeature === 'appointments' && (
                        <BusinessAppointmentsManager businessId={business.id} />
                      )}

                      {configuringFeature === 'linktree' && (
                        <BusinessLinktreeManager businessId={business.id} businessLogo={business.logo_url} />
                      )}

                      {configuringFeature === 'vacancies' && (
                        <BusinessJobVacanciesManager businessId={business.id} />
                      )}

                      {configuringFeature === 'negotiation' && (
                        <Card className="bg-card/50 backdrop-blur-sm border-2">
                          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-6 border-b">
                            <CardTitle className="flex items-center gap-2 text-emerald-600">
                              <MessageSquare className="w-5 h-5" />
                              Configurar Negociação
                            </CardTitle>
                            <CardDescription>
                              Personalize como os clientes podem negociar com você
                            </CardDescription>
                          </div>
                          <CardContent className="p-6">
                            <form onSubmit={handleSave} className="space-y-6">
                              {/* Status da Negociação */}
                              <div className="flex items-center justify-between p-4 border-2 rounded-lg bg-muted/30">
                                <div className="space-y-0.5">
                                  <Label className="text-base font-medium">Sistema de Negociação</Label>
                                  <p className="text-sm text-muted-foreground">
                                    Permitir que clientes negociem diretamente com você
                                  </p>
                                </div>
                                <Switch
                                  checked={business.enable_negotiation}
                                  onCheckedChange={(checked) => setBusiness({ ...business, enable_negotiation: checked })}
                                />
                              </div>

                              {business.enable_negotiation && (
                                <>
                                  {/* Título da Seção de Negociação */}
                                  <div className="space-y-2">
                                    <Label className="text-base font-medium">Título da Seção</Label>
                                    <Input
                                      placeholder="Ex: Entre em Contato, Solicite um Orçamento"
                                      className="text-base"
                                      defaultValue="Negocie Conosco"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Título exibido na seção de negociação do seu perfil
                                    </p>
                                  </div>

                                  {/* Mensagem de Boas-Vindas */}
                                  <div className="space-y-2">
                                    <Label className="text-base font-medium">Mensagem de Boas-Vindas</Label>
                                    <Textarea
                                      placeholder="Escreva uma mensagem inicial para seus clientes..."
                                      className="text-base resize-none"
                                      rows={3}
                                      defaultValue="Olá! Estou pronto para negociar e oferecer as melhores condições para você."
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Primeira mensagem que o cliente verá ao iniciar uma negociação
                                    </p>
                                  </div>

                                  {/* Tipos de Serviço */}
                                  <div className="space-y-2">
                                    <Label className="text-base font-medium">Tipos de Serviço</Label>
                                    <Input
                                      placeholder="Ex: Consultoria, Design, Desenvolvimento"
                                      className="text-base"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Separe por vírgula os tipos de serviço que você oferece
                                    </p>
                                  </div>

                                  {/* Tempo de Resposta */}
                                  <div className="space-y-2">
                                    <Label className="text-base font-medium">Tempo Médio de Resposta</Label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                                      <option value="minutes">Minutos</option>
                                      <option value="hours">Horas</option>
                                      <option value="days">Dias</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground">
                                      Informe aos clientes quanto tempo você leva para responder
                                    </p>
                                  </div>

                                  {/* Horário de Atendimento */}
                                  <div className="space-y-2">
                                    <Label className="text-base font-medium">Horário de Atendimento</Label>
                                    <Input
                                      placeholder="Ex: Seg-Sex: 9h-18h, Sáb: 9h-12h"
                                      className="text-base"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Quando você está disponível para negociar
                                    </p>
                                  </div>

                                  {/* Aceitar Propostas */}
                                  <div className="flex items-center justify-between p-4 border-2 rounded-lg bg-muted/30">
                                    <div className="space-y-0.5">
                                      <Label className="text-base font-medium">Aceitar Propostas de Valor</Label>
                                      <p className="text-sm text-muted-foreground">
                                        Permitir que clientes façam contrapropostas de preço
                                      </p>
                                    </div>
                                    <Switch defaultChecked />
                                  </div>

                                  {/* Aceitar Anexos */}
                                  <div className="flex items-center justify-between p-4 border-2 rounded-lg bg-muted/30">
                                    <div className="space-y-0.5">
                                      <Label className="text-base font-medium">Permitir Anexos</Label>
                                      <p className="text-sm text-muted-foreground">
                                        Clientes podem enviar arquivos durante a negociação
                                      </p>
                                    </div>
                                    <Switch defaultChecked />
                                  </div>

                                  {/* Notificações */}
                                  <div className="space-y-3">
                                    <Label className="text-base font-medium">Notificações</Label>
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <Label className="text-sm font-normal">Novas mensagens</Label>
                                        <Switch defaultChecked />
                                      </div>
                                      <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <Label className="text-sm font-normal">Novas propostas</Label>
                                        <Switch defaultChecked />
                                      </div>
                                      <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <Label className="text-sm font-normal">Contrapropostas</Label>
                                        <Switch defaultChecked />
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}

                              <Button 
                                type="submit" 
                                disabled={saving} 
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg transition-all text-base py-6"
                              >
                                <Save className="w-5 h-5 mr-2" />
                                {saving ? 'Salvando...' : 'Salvar Configurações'}
                              </Button>
                            </form>
                          </CardContent>
                        </Card>
                      )}

                      {configuringFeature === 'social' && (
                        <Card className="bg-card/50 backdrop-blur-sm border-2">
                          <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10 p-6 border-b">
                            <CardTitle className="text-purple-600">Redes Sociais</CardTitle>
                            <CardDescription>Configure seus links e contatos</CardDescription>
                          </div>
                          <CardContent className="p-6">
                            <form onSubmit={handleSave} className="space-y-4">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="flex items-center gap-2 text-base font-medium">
                                    <Globe className="w-4 h-4" />
                                    Website
                                  </Label>
                                  <Input
                                    value={business.website_url || ''}
                                    onChange={(e) => setBusiness({ ...business, website_url: e.target.value })}
                                    placeholder="https://seusite.com"
                                    className="text-base"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="flex items-center gap-2 text-base font-medium">
                                    <MessageCircle className="w-4 h-4" />
                                    WhatsApp
                                  </Label>
                                  <Input
                                    value={business.whatsapp || ''}
                                    onChange={(e) => setBusiness({ ...business, whatsapp: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                    className="text-base"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="flex items-center gap-2 text-base font-medium">
                                    <Facebook className="w-4 h-4" />
                                    Facebook
                                  </Label>
                                  <Input
                                    value={business.facebook || ''}
                                    onChange={(e) => setBusiness({ ...business, facebook: e.target.value })}
                                    placeholder="facebook.com/seu-perfil"
                                    className="text-base"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="flex items-center gap-2 text-base font-medium">
                                    <Instagram className="w-4 h-4" />
                                    Instagram
                                  </Label>
                                  <Input
                                    value={business.instagram || ''}
                                    onChange={(e) => setBusiness({ ...business, instagram: e.target.value })}
                                    placeholder="@seu_instagram"
                                    className="text-base"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="flex items-center gap-2 text-base font-medium">
                                    <Linkedin className="w-4 h-4" />
                                    LinkedIn
                                  </Label>
                                  <Input
                                    value={business.linkedin || ''}
                                    onChange={(e) => setBusiness({ ...business, linkedin: e.target.value })}
                                    placeholder="linkedin.com/in/seu-perfil"
                                    className="text-base"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="flex items-center gap-2 text-base font-medium">
                                    <Twitter className="w-4 h-4" />
                                    Twitter/X
                                  </Label>
                                  <Input
                                    value={business.twitter || ''}
                                    onChange={(e) => setBusiness({ ...business, twitter: e.target.value })}
                                    placeholder="@seu_twitter"
                                    className="text-base"
                                  />
                                </div>
                              </div>
                              <Button type="submit" disabled={saving} className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? 'Salvando...' : 'Salvar Redes Sociais'}
                              </Button>
                            </form>
                          </CardContent>
                        </Card>
                      )}

                      {configuringFeature === 'portfolio' && (
                        <>
                          <Card className="bg-card/50 backdrop-blur-sm border-2">
                            <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-6 border-b">
                              <CardTitle className="text-green-600">Adicionar Item ao Portfólio</CardTitle>
                            </div>
                            <CardContent className="p-6">
                              <form onSubmit={handleAddPortfolioItem} className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-base font-medium">Título</Label>
                                  <Input
                                    value={newPortfolioItem.title}
                                    onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })}
                                    required
                                    className="text-base"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-base font-medium">Descrição (opcional)</Label>
                                  <Textarea
                                    value={newPortfolioItem.description}
                                    onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, description: e.target.value })}
                                    rows={3}
                                    className="text-base resize-none"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-base font-medium">Imagem ou Vídeo</Label>
                                  <MediaUpload
                                    onUpload={(url, type) => {
                                      setNewPortfolioItem({ 
                                        ...newPortfolioItem, 
                                        url,
                                        type: type.startsWith('image') ? 'image' : 'video'
                                      });
                                    }}
                                    accept="image/*,video/*"
                                  />
                                </div>
                                <Button
                                  type="submit"
                                  disabled={!newPortfolioItem.title || !newPortfolioItem.url}
                                  className="w-full bg-gradient-to-r from-green-500 to-teal-500"
                                >
                                  <Plus className="w-5 h-5 mr-2" />
                                  Adicionar ao Portfólio
                                </Button>
                              </form>
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
                        </>
                      )}
                    </div>
                  ) : (
                    <Card className="bg-card/50 backdrop-blur-sm border-2">
                      <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 p-6 border-b">
                        <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                          <Zap className="w-5 h-5" />
                          Ferramentas Interativas
                        </CardTitle>
                        <CardDescription>
                          Ative funcionalidades extras para seu perfil profissional
                        </CardDescription>
                      </div>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {features.map((feature) => {
                            const Icon = feature.icon;
                            return (
                              <div
                                key={feature.key}
                                className={`relative rounded-lg p-6 transition-all hover:shadow-lg group ${
                                  feature.isActive
                                    ? `${feature.color} text-white`
                                    : 'bg-muted/50 border-2 hover:border-primary/50'
                                }`}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <Icon className={`w-8 h-8 ${feature.isActive ? '' : 'text-muted-foreground'}`} />
                                  <Switch
                                    checked={feature.isActive}
                                    onCheckedChange={() => handleToggleFeature(feature.key)}
                                    className={feature.isActive ? "data-[state=checked]:bg-white/30" : ""}
                                  />
                                </div>
                                <h4 className="font-bold text-lg mb-1">{feature.name}</h4>
                                <p className={`text-sm mb-4 ${
                                  feature.isActive ? 'text-white/90' : 'text-muted-foreground'
                                }`}>
                                  {feature.description}
                                </p>
                                {feature.isActive && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setConfiguringFeature(feature.key)}
                                    className="w-full"
                                  >
                                    Configurar
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Info */}
                        <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
                          <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-muted-foreground">
                              As ferramentas ativas aparecerão no seu perfil público. 
                              Ative ou desative conforme necessário.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}


              {/* Dashboard */}
              {activeSection === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Welcome Card */}
                  <Card className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-2">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold mb-2">
                            Bem-vindo, {business.company_name}! 👋
                          </h2>
                          <p className="text-muted-foreground">
                            Gerencie seu perfil profissional e acompanhe suas estatísticas
                          </p>
                        </div>
                        <Link to={`/${business.slug}`} target="_blank">
                          <Button variant="outline" size="lg" className="gap-2">
                            <ExternalLink className="w-4 h-4" />
                            Ver Perfil Público
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Views */}
                    <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 hover:shadow-lg transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Eye className="w-6 h-6 text-blue-500" />
                          </div>
                          <span className="text-sm text-muted-foreground">Total</span>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">{profileViews.toLocaleString()}</h3>
                        <p className="text-sm text-muted-foreground">Visualizações do Perfil</p>
                        {viewsLastWeek > 0 && (
                          <p className="text-xs text-green-500 mt-2">
                            +{viewsLastWeek} esta semana
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Total Posts */}
                    <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-2 hover:shadow-lg transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-orange-500/10 rounded-lg">
                            <MessagesSquare className="w-6 h-6 text-orange-500" />
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setActiveSection('posts')}
                            className="text-xs"
                          >
                            Ver todos
                          </Button>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">{posts.length}</h3>
                        <p className="text-sm text-muted-foreground">Posts Publicados</p>
                      </CardContent>
                    </Card>

                    {/* Total Evaluations */}
                    <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-2 hover:shadow-lg transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-pink-500/10 rounded-lg">
                            <Star className="w-6 h-6 text-pink-500" />
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setActiveSection('evaluations')}
                            className="text-xs"
                          >
                            Ver todas
                          </Button>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">{evaluations.length}</h3>
                        <p className="text-sm text-muted-foreground">Avaliações Recebidas</p>
                        {business.average_rating > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                            <span className="text-sm font-medium">{business.average_rating.toFixed(1)}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Active Tools */}
                    <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-2 hover:shadow-lg transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-purple-500/10 rounded-lg">
                            <Zap className="w-6 h-6 text-purple-500" />
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setActiveSection('tools')}
                            className="text-xs"
                          >
                            Gerenciar
                          </Button>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">
                          {features.filter(f => f.isActive).length}
                        </h3>
                        <p className="text-sm text-muted-foreground">Ferramentas Ativas</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Profile Info Card */}
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        Informações do Perfil
                      </CardTitle>
                    </div>
                    <CardContent className="p-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-muted-foreground">Nome da Empresa</Label>
                            <p className="text-lg font-medium mt-1">{business.company_name}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Categoria</Label>
                            <p className="text-lg font-medium mt-1">{business.category || 'Não definida'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Telefone</Label>
                            <p className="text-lg font-medium mt-1">{business.phone || 'Não informado'}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-muted-foreground">Email</Label>
                            <p className="text-lg font-medium mt-1">{business.email || 'Não informado'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Endereço</Label>
                            <p className="text-lg font-medium mt-1">{business.address || 'Não informado'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Status</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <div className={`w-2 h-2 rounded-full ${business.active ? 'bg-green-500' : 'bg-red-500'}`} />
                              <p className="text-lg font-medium">{business.active ? 'Ativo' : 'Inativo'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 pt-6 border-t">
                        <Button 
                          onClick={() => setActiveSection('info')}
                          className="w-full"
                          variant="outline"
                        >
                          Editar Informações
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Active Tools Card */}
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Ferramentas Ativas ({features.filter(f => f.isActive).length})
                      </CardTitle>
                    </div>
                    <CardContent className="p-6">
                      {features.filter(f => f.isActive).length === 0 ? (
                        <div className="text-center py-8">
                          <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground mb-4">Nenhuma ferramenta ativa ainda</p>
                          <Button onClick={() => setActiveSection('tools')}>
                            Ativar Ferramentas
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {features.filter(f => f.isActive).map((feature) => (
                            <div
                              key={feature.key}
                              className={`${feature.color} p-4 rounded-lg cursor-pointer hover:opacity-80 transition-all`}
                              onClick={() => {
                                setActiveSection('tools');
                                setConfiguringFeature(feature.key);
                              }}
                            >
                              <feature.icon className="w-8 h-8 text-white mb-2" />
                              <p className="text-sm font-medium text-white">{feature.name}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-6 border-b">
                      <CardTitle>Ações Rápidas</CardTitle>
                    </div>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Button
                          variant="outline"
                          className="h-auto flex-col gap-2 py-6"
                          onClick={() => setActiveSection('posts')}
                        >
                          <Plus className="w-6 h-6" />
                          <span>Criar Post</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto flex-col gap-2 py-6"
                          onClick={() => setActiveSection('profile-cover')}
                        >
                          <ImageIcon className="w-6 h-6" />
                          <span>Atualizar Fotos</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto flex-col gap-2 py-6"
                          onClick={() => setActiveSection('tools')}
                        >
                          <Zap className="w-6 h-6" />
                          <span>Ferramentas</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto flex-col gap-2 py-6"
                          onClick={() => setActiveSection('info')}
                        >
                          <Info className="w-6 h-6" />
                          <span>Editar Info</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}


              {/* Posts */}
              {activeSection === 'posts' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Create Post Area - Facebook Style */}
                  <Card className="bg-card/50 backdrop-blur-sm border-2 hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      {!postExpanded ? (
                        <>
                          <div 
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => setPostExpanded(true)}
                          >
                            {business.logo_url ? (
                              <img 
                                src={business.logo_url} 
                                alt={business.company_name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-border"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                                <Building2 className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div 
                              className="flex-1 bg-muted hover:bg-muted/80 rounded-full px-4 py-3 text-muted-foreground transition-colors"
                            >
                              Compartilhe algo no perfil profissional de {business.company_name}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                            <Button 
                              variant="ghost" 
                              className="flex-1 gap-2 hover:bg-muted/50"
                              onClick={() => {
                                setPostExpanded(true);
                                setTimeout(() => imageInputRef.current?.click(), 100);
                              }}
                            >
                              <ImageIcon className="w-5 h-5 text-green-500" />
                              <span className="text-muted-foreground">Foto</span>
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            {business.logo_url ? (
                              <img 
                                src={business.logo_url} 
                                alt={business.company_name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-border"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                                <Building2 className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <Textarea
                              placeholder={`Compartilhe algo no perfil profissional de ${business.company_name}`}
                              value={postContent}
                              onChange={(e) => setPostContent(e.target.value)}
                              rows={3}
                              className="flex-1 resize-none border-0 focus-visible:ring-0 p-0"
                              autoFocus
                            />
                          </div>

                          {postImages.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {postImages.map((url, i) => (
                                <div key={i} className="relative group">
                                  <img 
                                    src={url} 
                                    alt="" 
                                    className="w-full h-48 object-cover rounded-lg" 
                                  />
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleRemoveImage(i)}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                          />

                          <div className="flex items-center justify-between pt-3 border-t">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="gap-2"
                              onClick={() => imageInputRef.current?.click()}
                            >
                              <ImageIcon className="w-5 h-5 text-green-500" />
                              <span>Adicionar imagens</span>
                            </Button>

                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setPostExpanded(false);
                                  setPostContent('');
                                  setPostImages([]);
                                }}
                              >
                                Cancelar
                              </Button>
                              <Button 
                                size="sm"
                                onClick={handleCreatePost}
                                disabled={posting || (!postContent.trim() && postImages.length === 0)}
                                className="bg-gradient-primary hover:shadow-glow"
                              >
                                {posting ? 'Publicando...' : 'Publicar'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

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
                            <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-all">
                              {/* Header do Post */}
                              <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                  {business.logo_url ? (
                                    <img 
                                      src={business.logo_url} 
                                      alt={business.company_name}
                                      className="w-10 h-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                      <Building2 className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-semibold text-sm">{business.company_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(post.created_at).toLocaleDateString('pt-BR', { 
                                        day: 'numeric', 
                                        month: 'long',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeletePost(post.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>

                              {/* Conteúdo do Post */}
                              <div className="px-4 pb-3">
                                <p 
                                  className={`whitespace-pre-wrap ${
                                    !post.media_urls || post.media_urls.length === 0 
                                      ? 'text-2xl leading-relaxed' 
                                      : 'text-base'
                                  }`}
                                >
                                  {post.content}
                                </p>
                              </div>

                              {/* Imagens */}
                              {post.media_urls && post.media_urls.length > 0 && (
                                <div className={
                                  post.media_urls.length === 1 
                                    ? 'w-full' 
                                    : 'grid grid-cols-2 gap-1'
                                }>
                                  {post.media_urls.map((url, i) => (
                                    <img 
                                      key={i} 
                                      src={url} 
                                      alt="" 
                                      className={`w-full object-cover ${
                                        post.media_urls.length === 1 
                                          ? 'max-h-[500px]' 
                                          : 'h-64'
                                      }`}
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Ações do Post */}
                              <div className="border-t">
                                <div className="flex items-center justify-around p-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className={`flex-1 gap-2 hover:bg-muted ${
                                      postLikes[post.id]?.some(like => like.profile_id === currentProfileId) 
                                        ? 'text-blue-600' 
                                        : ''
                                    }`}
                                    onClick={() => handleToggleLike(post.id)}
                                  >
                                    <ThumbsUp className={`w-5 h-5 ${
                                      postLikes[post.id]?.some(like => like.profile_id === currentProfileId) 
                                        ? 'fill-current' 
                                        : ''
                                    }`} />
                                    <span className="font-medium">
                                      Curtir {postLikes[post.id]?.length > 0 && `(${postLikes[post.id].length})`}
                                    </span>
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="flex-1 gap-2 hover:bg-muted"
                                    onClick={() => setShowComments({ ...showComments, [post.id]: !showComments[post.id] })}
                                  >
                                    <MessageCircleMore className="w-5 h-5" />
                                    <span className="font-medium">
                                      Comentar {postComments[post.id]?.length > 0 && `(${postComments[post.id].length})`}
                                    </span>
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="flex-1 gap-2 hover:bg-muted"
                                    onClick={() => {
                                      const postUrl = `${window.location.origin}/${business.slug}`;
                                      setSharePostUrl(postUrl);
                                      setShareDialogOpen(true);
                                    }}
                                  >
                                    <Share2 className="w-5 h-5" />
                                    <span className="font-medium">Compartilhar</span>
                                  </Button>
                                </div>

                                {/* Comentários Existentes */}
                                {postComments[post.id]?.length > 0 && (
                                  <div className="border-t p-4 space-y-3 bg-muted/10">
                                    {postComments[post.id].map((comment) => (
                                      <div key={comment.id} className="flex gap-3">
                                        {comment.profile.avatar_url ? (
                                          <img 
                                            src={comment.profile.avatar_url} 
                                            alt={comment.profile.full_name}
                                            className="w-8 h-8 rounded-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                            <Building2 className="w-4 h-4 text-muted-foreground" />
                                          </div>
                                        )}
                                        <div className="flex-1">
                                          <div className="bg-muted rounded-lg p-3">
                                            <p className="font-semibold text-sm">{comment.profile.full_name}</p>
                                            <p className="text-sm mt-1">{comment.content}</p>
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-1 ml-1">
                                            {new Date(comment.created_at).toLocaleDateString('pt-BR', {
                                              day: 'numeric',
                                              month: 'short',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Campo de Comentário */}
                                {showComments[post.id] && (
                                  <div className="p-4 border-t bg-muted/20">
                                    <div className="flex gap-2">
                                      {business.logo_url ? (
                                        <img 
                                          src={business.logo_url} 
                                          alt={business.company_name}
                                          className="w-8 h-8 rounded-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                          <Building2 className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                      )}
                                      <div className="flex-1">
                                        <Textarea
                                          placeholder="Escreva um comentário..."
                                          value={commentText[post.id] || ''}
                                          onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                                          rows={2}
                                          className="resize-none"
                                        />
                                        <div className="flex justify-end mt-2">
                                          <Button 
                                            size="sm"
                                            onClick={() => handleAddComment(post.id)}
                                            disabled={!commentText[post.id]?.trim()}
                                          >
                                            Comentar
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Dialog de Compartilhamento */}
                  <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Compartilhar perfil</DialogTitle>
                        <DialogDescription>
                          Copie o link abaixo para compartilhar este perfil
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex items-center space-x-2">
                        <div className="grid flex-1 gap-2">
                          <Input
                            id="link"
                            value={sharePostUrl}
                            readOnly
                            className="h-10"
                          />
                        </div>
                        <Button
                          size="sm"
                          className="px-3"
                          onClick={() => {
                            navigator.clipboard.writeText(sharePostUrl);
                            toast({
                              title: 'Link copiado!',
                              description: 'O link foi copiado para a área de transferência.',
                            });
                            setShareDialogOpen(false);
                          }}
                        >
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Copiar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
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

              {/* Informações */}
              {activeSection === 'info' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Informações do Perfil */}
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-cyan-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-indigo-600">
                        <Briefcase className="w-5 h-5" />
                        Informações do Perfil
                      </CardTitle>
                      <CardDescription>Informações básicas do seu negócio</CardDescription>
                    </div>
                    <CardContent className="p-6">
                      <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-base font-medium">Nome do Perfil</Label>
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
                        <Button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:shadow-lg transition-all text-base py-6" disabled={saving}>
                          <Save className="w-5 h-5 mr-2" />
                          {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Admin - Administration */}
              {activeSection === 'admin' && business && (
                <div className="animate-fade-in">
                  <BusinessAdministrators businessId={business.id} />
                </div>
              )}

              {/* Configurações */}
              {activeSection === 'settings' && (
                <div className="space-y-6 animate-fade-in">

                  {/* Mudar URL do Perfil */}
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-purple-500/10 via-violet-500/10 to-indigo-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-purple-600">
                        <LinkIcon className="w-5 h-5" />
                        URL do Perfil Profissional
                      </CardTitle>
                      <CardDescription>
                        Altere a URL do seu perfil (permitido a cada 7 dias)
                      </CardDescription>
                    </div>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                          <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-muted-foreground">
                              Por motivos de segurança e SEO, a URL só pode ser alterada uma vez a cada 7 dias.
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-base font-medium">URL Atual</Label>
                          <div className="flex gap-2">
                            <Input
                              value={`woorkins.com/${business.slug}`}
                              readOnly
                              className="text-base bg-muted"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                navigator.clipboard.writeText(`https://woorkins.com/${business.slug}`);
                                toast({ title: "Link copiado!" });
                              }}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-base font-medium">Nova URL</Label>
                          <div className="flex gap-2">
                            <div className="flex-1 flex items-center gap-2 border-2 rounded-md px-3 bg-background">
                              <span className="text-muted-foreground text-sm">woorkins.com/</span>
                              <Input
                                value={business.slug}
                                onChange={(e) => {
                                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                  setBusiness({ ...business, slug: value });
                                }}
                                placeholder="sua-empresa"
                                className="border-0 shadow-none focus-visible:ring-0 p-0 text-base"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Use apenas letras minúsculas, números e hífens
                          </p>
                        </div>
                        <Button 
                          onClick={handleSave} 
                          disabled={saving}
                          className="w-full bg-gradient-to-r from-purple-500 to-indigo-500"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {saving ? 'Salvando...' : 'Atualizar URL'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Grid com 2 colunas */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Visibilidade do Perfil */}
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

                    {/* Zona de Perigo */}
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
                              <AlertDialogDescription className="space-y-3">
                                <p>Esta ação não pode ser desfeita. Isso excluirá permanentemente seu perfil profissional, 
                                incluindo todos os posts, portfólio e avaliações associadas.</p>
                                <p className="font-medium text-foreground">Nota: Seu perfil de interações na plataforma não será afetado.</p>
                                <div className="pt-2">
                                  <Label htmlFor="confirm-delete" className="text-sm">
                                    Digite <span className="font-mono">@{business?.slug}</span> para confirmar
                                  </Label>
                                  <Input
                                    id="confirm-delete"
                                    placeholder={`@${business?.slug}`}
                                    value={deleteConfirmSlug}
                                    onChange={(e) => setDeleteConfirmSlug(e.target.value)}
                                    className="mt-2"
                                  />
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDeleteConfirmSlug('')}>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={confirmDeleteProfile}
                                disabled={deleteConfirmSlug !== `@${business?.slug}`}
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
                </div>
              )}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}
