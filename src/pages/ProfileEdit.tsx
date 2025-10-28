import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
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
import { ProfilePhotoUpload } from '@/components/ProfilePhotoUpload';
import { ImageUpload } from '@/components/ImageUpload';
import { MediaUpload } from '@/components/MediaUpload';
import { CreatePostDialog } from '@/components/CreatePostDialog';
import { 
  ArrowLeft, Save, Star, MessageSquare, Plus, Trash2, Shield,
  Facebook, Instagram, Linkedin, Twitter, Globe, MessageCircle,
  AlertTriangle, Info, Image as ImageIcon, Users, MessagesSquare,
  Eye, EyeOff, ExternalLink, Upload, X, Briefcase, Zap, Play,
  ShoppingBag, ThumbsUp, Award, Calendar, Link as LinkIcon, Briefcase as BriefcaseIcon, Building2,
  Heart, Share2, MessageCircleMore, User
} from 'lucide-react';
import { GenericSocialManager } from '@/components/generic/GenericSocialManager';
import { GenericPortfolioManager } from '@/components/generic/GenericPortfolioManager';
import { GenericBannersManager } from '@/components/generic/GenericBannersManager';
import { GenericVideoManager } from '@/components/generic/GenericVideoManager';
import { GenericCatalogManager } from '@/components/generic/GenericCatalogManager';
import { GenericTestimonialsManager } from '@/components/generic/GenericTestimonialsManager';
import { GenericCertificationsManager } from '@/components/generic/GenericCertificationsManager';
import { GenericAppointmentsManager } from '@/components/generic/GenericAppointmentsManager';
import { GenericLinktreeManager } from '@/components/generic/GenericLinktreeManager';
import { GenericJobVacanciesManager } from '@/components/generic/GenericJobVacanciesManager';
import { GenericWhatsAppManager } from '@/components/generic/GenericWhatsAppManager';
import { checkIdentifierAvailable, normalizeIdentifier, validateIdentifierFormat } from '@/lib/identifierValidation';
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

interface Profile {
  id: string;
  user_id: string;
  profile_id?: string;
  username: string;
  username_last_changed?: string | null;
  slug?: string;
  full_name: string | null;
  company_name?: string;
  bio: string | null;
  description?: string | null;
  avatar_url: string | null;
  logo_url?: string | null;
  cover_url: string | null;
  location: string | null;
  address?: string | null;
  website: string | null;
  website_url?: string | null;
}

interface UserPost {
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

interface UserFeature {
  key: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  isActive: boolean;
}

export default function ProfileEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { openWithMessage } = useAIAssistant();
  const [searchParams] = useSearchParams();
  const { profileId: urlProfileId } = useParams();
  const businessId = searchParams.get('businessId') || urlProfileId;

  useEffect(() => {
    document.title = 'Editar Perfil - Woorkins';
  }, []);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileType, setProfileType] = useState<'user' | 'business'>('user');
  const [businessProfiles, setBusinessProfiles] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [responses, setResponses] = useState<{ [key: string]: string }>({});
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [features, setFeatures] = useState<UserFeature[]>([]);
  const [configuringFeature, setConfiguringFeature] = useState<string | null>(null);
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
  const [canEditUsername, setCanEditUsername] = useState(true);
  const [daysUntilUsernameEdit, setDaysUntilUsernameEdit] = useState(0);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showUsernameConfirm, setShowUsernameConfirm] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Refs para inputs de upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
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

  const availableFeatures: Omit<UserFeature, 'isActive'>[] = [
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
    },
    {
      key: 'whatsapp',
      name: 'WhatsApp Widget',
      description: 'Botão flutuante de contato direto',
      icon: MessageCircle,
      color: 'bg-gradient-to-br from-green-500 to-emerald-500'
    }
  ];

  useEffect(() => {
    if (businessId) {
      loadBusinessProfile(businessId);
      // Ao entrar com businessId, abrir direto na aba de informações
      setActiveSection('info');
    } else {
      loadProfile();
    }
    loadEvaluations();
    loadCurrentProfile();
  }, [user, businessId]);

  useEffect(() => {
    if (profile?.id) {
      loadPosts();
      loadFeatures();
      loadProfileViews();
    }
  }, [profile?.id]);

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

  const loadProfile = async () => {
    if (!user) return;

    try {
      // Buscar explicitamente o perfil do tipo 'user'
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('profile_type', 'user')
        .maybeSingle();

      if (error) {
        console.error('[ProfileEdit] Erro ao carregar perfil:', error);
        throw error;
      }

      // Se não existe perfil user, criar um usando getOrCreateUserProfile
      if (!data) {
        console.log('[ProfileEdit] Perfil user não encontrado, criando...');
        const { getOrCreateUserProfile } = await import('@/lib/profiles');
        const profiles = await getOrCreateUserProfile(user);
        const userProfile = profiles.find(p => (p as any).profile_type === 'user');
        
        if (!userProfile) {
          toast({
            title: 'Erro',
            description: 'Não foi possível criar o perfil',
            variant: 'destructive',
          });
          navigate('/painel');
          return;
        }

        setProfile(userProfile as any);
      } else {
        setProfile(data);
      }

      setProfileType('user');
      setLoading(false);
      
      // Carregar lista de perfis de negócio do usuário
      const { data: businesses } = await supabase
        .from('profiles')
        .select('id, company_name, slug')
        .eq('user_id', user?.id)
        .eq('profile_type', 'business');
      
      if (businesses) {
        setBusinessProfiles(businesses);
      }
    } catch (error) {
      console.error('[ProfileEdit] Erro fatal:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o perfil',
        variant: 'destructive',
      });
      navigate('/painel');
    }
  };

  const loadBusinessProfile = async (id: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('profile_type', 'business')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: 'Erro',
        description: 'Perfil profissional não encontrado ou você não tem permissão',
        variant: 'destructive',
      });
      navigate('/painel');
      return;
    }

    setProfile(data as unknown as Profile);
    setProfileType('business');
    setLoading(false);
    
    // Carregar lista de perfis de negócio do usuário
    const { data: businesses } = await supabase
      .from('profiles')
      .select('id, company_name, slug')
      .eq('user_id', user?.id)
      .eq('profile_type', 'business');
    
    if (businesses) {
      setBusinessProfiles(businesses);
    }
  };

  const loadEvaluations = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles' as any)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profileData) return;

    const { data: evaluationsData } = await supabase
      .from('evaluations' as any)
      .select('id, title, content, rating, created_at, public_response, user_id')
      .eq('profile_id', (profileData as any).id)
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

  const loadPosts = async () => {
    if (!profile?.id) return;

    const tableName = profileType === 'user' ? 'user_posts' : 'business_posts';
    const idColumn = profileType === 'user' ? 'profile_id' : 'business_id';

    const { data } = await supabase
      .from(tableName as any)
      .select('*')
      .eq(idColumn, profile.id)
      .order('created_at', { ascending: false });

    if (data) {
      setPosts(data as any);
      data.forEach((post: any) => {
        loadPostComments(post.id);
        loadPostLikes(post.id);
      });
    }
  };

  const loadPostComments = async (postId: string) => {
    const { data: commentsData } = await supabase
      .from('user_post_comments' as any)
      .select('id, post_id, profile_id, content, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (commentsData && commentsData.length > 0) {
      const profileIds = commentsData.map((c: any) => c.profile_id);
      const { data: profilesData } = await supabase
        .from('profiles' as any)
        .select('id, full_name, avatar_url')
        .in('id', profileIds);

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
      .from('user_post_likes' as any)
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
      const { error } = await supabase
        .from('user_post_likes' as any)
        .delete()
        .eq('post_id', postId)
        .eq('profile_id', currentProfileId);

      if (!error) {
        loadPostLikes(postId);
      }
    } else {
      const { error } = await supabase
        .from('user_post_likes' as any)
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
      .from('user_post_comments' as any)
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
    if (!profile?.id) return;

    // Usar sempre a tabela profile_features com profile_id
    const { data } = await supabase
      .from('profile_features' as any)
      .select('*')
      .eq('profile_id', profile.id);

    const featuresMap = new Map(data?.map((f: any) => [f.feature_key, f.is_active]) || []);
    
    const allFeatures = availableFeatures.map(f => ({
      ...f,
      isActive: featuresMap.get(f.key) || false
    }));

    allFeatures.sort((a, b) => {
      if (a.isActive === b.isActive) return 0;
      return a.isActive ? -1 : 1;
    });

    setFeatures(allFeatures);
  };

  const loadProfileViews = async () => {
    if (!profile?.id) return;

    const { count: totalViews } = await supabase
      .from('profile_views' as any)
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { count: weekViews } = await supabase
      .from('profile_views' as any)
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .gte('viewed_at', oneWeekAgo.toISOString());

    setProfileViews(totalViews || 0);
    setViewsLastWeek(weekViews || 0);
  };

  const handleToggleFeature = async (featureKey: string) => {
    if (!profile?.id) return;

    const feature = features.find(f => f.key === featureKey);
    if (!feature) return;

    const newActiveState = !feature.isActive;

    setFeatures(prevFeatures => 
      prevFeatures.map(f => 
        f.key === featureKey ? { ...f, isActive: newActiveState } : f
      )
    );

    if (newActiveState) {
      setActiveSection('tools');
    }

    // Usar sempre a tabela profile_features com profile_id
    const { error } = await supabase
      .from('profile_features' as any)
      .upsert({
        profile_id: profile.id,
        feature_key: featureKey,
        is_active: newActiveState,
        settings: {}
      }, {
        onConflict: 'profile_id,feature_key'
      });

    if (!error) {
      toast({
        title: newActiveState ? 'Ferramenta ativada!' : 'Ferramenta desativada',
        description: `${feature.name} foi ${newActiveState ? 'ativada' : 'desativada'}.`
      });
    } else {
      console.error('[ProfileEdit] Erro ao atualizar feature:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      toast({
        title: 'Erro ao atualizar ferramenta',
        description: `${error.message} (${error.code || 'desconhecido'})`,
        variant: 'destructive'
      });
      loadFeatures();
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile || !user) return;

    setSaving(true);

    // Dados unificados para ambos tipos de perfil
    const updateData = {
      full_name: profile.full_name,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id);

    if (error) {
      console.error('[ProfileEdit] Erro ao salvar perfil:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        profileId: profile.id,
        profileType,
        updateData
      });
      toast({
        title: 'Erro ao salvar perfil',
        description: `${error.message} (Código: ${error.code || 'desconhecido'})`,
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

  // Função para calcular dias até próxima mudança de username
  const getDaysUntilUsernameChange = (lastChanged: string | null | undefined): number => {
    if (!lastChanged) return 0; // Nunca alterou, pode alterar
    
    const lastChangedDate = new Date(lastChanged);
    const now = new Date();
    const diffTime = now.getTime() - lastChangedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, 7 - diffDays);
  };

  // Verificar se pode alterar username (primeira vez ou após 7 dias)
  const canChangeUsername = (lastChanged: string | null | undefined): boolean => {
    if (!lastChanged) return true; // Nunca alterou, pode alterar
    return getDaysUntilUsernameChange(lastChanged) === 0;
  };

  // Validar username em tempo real
  const validateUsername = async (username: string) => {
    if (!username || username.trim() === '') {
      setUsernameError('Username não pode estar vazio');
      return false;
    }

    const normalized = normalizeIdentifier(username);
    if (normalized !== username) {
      setUsernameError('Use apenas letras minúsculas, números e hífens');
      return false;
    }

    const formatValidation = validateIdentifierFormat(username);
    if (!formatValidation.valid) {
      setUsernameError(formatValidation.error || 'Username inválido');
      return false;
    }

    // Se é o mesmo username atual, não precisa checar disponibilidade
    if (username === profile?.username) {
      setUsernameError('');
      return true;
    }

    setCheckingUsername(true);
    const isAvailable = await checkIdentifierAvailable(username);
    setCheckingUsername(false);

    if (!isAvailable) {
      setUsernameError('Este username já está em uso');
      return false;
    }

    setUsernameError('');
    return true;
  };

  // Salvar novo username
  const handleUsernameChange = async () => {
    if (!profile || !newUsername) return;

    const isValid = await validateUsername(newUsername);
    if (!isValid) return;

    // Verificar cooldown novamente (por segurança)
    if (!canChangeUsername(profile.username_last_changed)) {
      toast({
        title: 'Alteração bloqueada',
        description: `Você poderá alterar seu username em ${getDaysUntilUsernameChange(profile.username_last_changed)} dias`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    // Atualizar username e username_last_changed
    // Se for business, também atualizar o slug para liberar o identificador antigo
    const updateData: any = {
      username: newUsername,
    };

    // Se for perfil business, atualizar o slug também
    if (profileType === 'business') {
      updateData.slug = newUsername;
    }

    // Setar username_last_changed apenas se for NULL (primeira vez) ou após cooldown
    if (!profile.username_last_changed) {
      updateData.username_last_changed = new Date().toISOString();
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id);

    if (error) {
      console.error('[ProfileEdit] Erro ao alterar username:', error);
      toast({
        title: 'Erro ao alterar username',
        description: error.message,
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    // Atualizar estado local (incluir slug se for business)
    const updatedProfile = {
      ...profile,
      username: newUsername,
      slug: profileType === 'business' ? newUsername : profile.slug,
      username_last_changed: updateData.username_last_changed || profile.username_last_changed,
    };
    
    console.log('[ProfileEdit] Atualizando username:', {
      antigo: profile.username,
      novo: newUsername,
      profile: updatedProfile
    });
    
    setProfile(updatedProfile);

    toast({
      title: 'Username atualizado',
      description: 'Seu username foi alterado com sucesso!',
    });

    setEditingUsername(false);
    setNewUsername('');
    setShowUsernameConfirm(false);
    setSaving(false);
  };

  const handlePhotoUpdated = () => {
    loadProfile();
  };

  const handleAvatarUpload = async (url: string) => {
    if (!profile) return;

    // Campo unificado para ambos tipos
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', profile.id);

    if (error) {
      console.error('[ProfileEdit] Erro ao atualizar foto:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      toast({ 
        title: 'Erro ao atualizar foto',
        description: `${error.message} (${error.code || 'desconhecido'})`,
        variant: 'destructive'
      });
    } else {
      setProfile({ ...profile, avatar_url: url });
      toast({ title: 'Foto de perfil atualizada!' });
    }
  };

  const handleCoverUpload = async (url: string) => {
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({ cover_url: url })
      .eq('id', profile.id);

    if (error) {
      console.error('[ProfileEdit] Erro ao atualizar capa:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      toast({ 
        title: 'Erro ao atualizar capa',
        description: `${error.message} (${error.code || 'desconhecido'})`,
        variant: 'destructive'
      });
    } else {
      setProfile({ ...profile, cover_url: url });
      toast({ title: 'Capa atualizada!' });
    }
  };
  
  const handleAvatarDelete = async () => {
    if (!profile) return;

    // Campo unificado
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', profile.id);

    if (error) {
      console.error('[ProfileEdit] Erro ao remover foto:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      toast({ 
        title: 'Erro ao remover foto',
        description: `${error.message} (${error.code || 'desconhecido'})`,
        variant: 'destructive'
      });
    } else {
      setProfile({ ...profile, avatar_url: null });
      toast({ title: 'Foto de perfil removida!' });
    }
  };

  const handleCoverDelete = async () => {
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({ cover_url: null })
      .eq('id', profile.id);

    if (error) {
      console.error('[ProfileEdit] Erro ao remover capa:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      toast({ 
        title: 'Erro ao remover capa',
        description: `${error.message} (${error.code || 'desconhecido'})`,
        variant: 'destructive'
      });
    } else {
      setProfile({ ...profile, cover_url: null });
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

  const handleDeletePost = async (id: string) => {
    try {
      const tableName = profileType === 'user' ? 'user_posts' : 'business_posts';
      
      const { error } = await supabase
        .from(tableName as any)
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

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      const { error } = await supabase
        .from('user_post_comments' as any)
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast({ title: 'Comentário removido' });
      loadPostComments(postId);
    } catch (error: any) {
      toast({
        title: 'Erro ao remover comentário',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user?.id) return;

    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;

      try {
        const { data, error } = await supabase.storage
          .from('user-media')
          .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('user-media')
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
      const tableName = profileType === 'user' ? 'user_posts' : 'business_posts';
      const idColumn = profileType === 'user' ? 'profile_id' : 'business_id';

      const { error } = await supabase
        .from(tableName as any)
        .insert({
          [idColumn]: profile?.id,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
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
                <h2 className="text-lg font-bold px-2">
                  {profileType === 'business' ? 'Perfil Profissional' : 'Perfil do Usuário'}
                </h2>
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
                  <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Ferramentas Ativas
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {features.filter(f => f.isActive).map((feature) => {
                        const Icon = feature.icon;
                        const isActive = activeSection === `tools-${feature.key}`;
                        return (
                          <SidebarMenuItem key={feature.key}>
                            <SidebarMenuButton
                              onClick={() => {
                                setActiveSection(`tools-${feature.key}` as Section);
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

              <SidebarGroup>
                <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Personalização
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {customizationItems.map((item) => {
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

              <SidebarGroup>
                <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
              {/* Header do perfil - não mostrar no dashboard */}
              {activeSection !== 'dashboard' && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {profile.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt={profile.full_name || profile.username}
                          className="w-12 h-12 rounded-full object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                          <User className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h1 className="text-3xl font-bold">
                          {profile.full_name || profile.username}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                          @{profile.username || profile.slug}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/${profileType === 'business' ? profile.slug : profile.username}`, '_blank')}
                      className="gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ver Perfil
                    </Button>
                  </div>
                </div>
              )}

              {/* Dashboard */}
              {activeSection === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Welcome Card */}
                  <Card className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-2">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary/20">
                            {profile.avatar_url ? (
                              <img 
                                src={profile.avatar_url} 
                                alt={profile.full_name || profile.username}
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                <User className="w-8 h-8 text-primary/40" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold mb-2">
                              Perfil de {profile.full_name || profile.username}
                            </h2>
                            <p className="text-muted-foreground">
                              Gerencie seu perfil e acompanhe suas estatísticas
                            </p>
                          </div>
                        </div>
                        <Link to={`/${profileType === 'business' ? profile.slug : profile.username}`} target="_blank">
                          <Button variant="outline" size="lg" className="gap-2">
                            <ExternalLink className="w-4 h-4" />
                            Ver Perfil Público
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-600">
                          <Eye className="w-5 h-5" />
                          Visualizações
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{profileViews}</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          +{viewsLastWeek} esta semana
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-600">
                          <MessagesSquare className="w-5 h-5" />
                          Posts
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{posts.length}</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Publicações totais
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-600">
                          <Star className="w-5 h-5" />
                          Avaliações
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{evaluations.length}</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Total de avaliações
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <CardHeader>
                      <CardTitle>Ações Rápidas</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Button
                        variant="outline"
                        className="h-auto flex-col py-4 gap-2"
                        onClick={() => setActiveSection('posts')}
                      >
                        <MessagesSquare className="w-6 h-6" />
                        <span className="text-sm">Criar Post</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto flex-col py-4 gap-2"
                        onClick={() => setActiveSection('tools')}
                      >
                        <Zap className="w-6 h-6" />
                        <span className="text-sm">Ferramentas</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto flex-col py-4 gap-2"
                        onClick={() => setActiveSection('profile-cover')}
                      >
                        <User className="w-6 h-6" />
                        <span className="text-sm">Editar Foto</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto flex-col py-4 gap-2"
                        onClick={() => setActiveSection('info')}
                      >
                        <Info className="w-6 h-6" />
                        <span className="text-sm">Informações</span>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Perfil e Capa */}
              {activeSection === 'profile-cover' && (
                <div className="space-y-6 animate-fade-in">
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
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const imageUpload = document.querySelector('[data-upload-type="avatar"]');
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
                          <div className="relative group h-48 w-full overflow-hidden rounded-t-lg">
                            {profile.cover_url ? (
                              <img 
                                src={profile.cover_url} 
                                alt="Capa" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                            )}
                            
                            {/* Hover Overlay para Capa */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <div className="flex gap-2">
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="h-10 w-10 rounded-full shadow-lg bg-green-500 hover:bg-green-600 text-white"
                                  onClick={() => coverInputRef.current?.click()}
                                  title="Alterar capa"
                                >
                                  <Upload className="h-5 w-5" />
                                </Button>
                                {profile.cover_url && (
                                  <Button
                                    size="icon"
                                    variant="destructive"
                                    className="h-10 w-10 rounded-full shadow-lg"
                                    onClick={handleCoverDelete}
                                    title="Remover capa"
                                  >
                                    <X className="h-5 w-5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="relative px-4 pb-4">
                            <div className="absolute -top-12 left-4">
                              <div className="relative group w-32 h-32 rounded-xl border-4 border-background overflow-hidden bg-background shadow-xl">
                                {profile.avatar_url ? (
                                  <img 
                                    src={profile.avatar_url} 
                                    alt="Avatar" 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-muted flex items-center justify-center">
                                    <User className="w-10 h-10 text-muted-foreground" />
                                  </div>
                                )}
                                {/* Hover Overlay para Avatar */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                  <div className="flex gap-2">
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      className="h-9 w-9 rounded-full shadow-lg bg-green-500 hover:bg-green-600 text-white"
                                      onClick={() => avatarInputRef.current?.click()}
                                      title="Alterar foto"
                                    >
                                      <Upload className="h-4 w-4" />
                                    </Button>
                                    {profile.avatar_url && (
                                      <Button
                                        size="icon"
                                        variant="destructive"
                                        className="h-9 w-9 rounded-full shadow-lg"
                                        onClick={handleAvatarDelete}
                                        title="Remover foto"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="pt-6 pl-40">
                              <div className="inline-block bg-background/95 backdrop-blur-sm px-6 py-2 rounded-lg shadow-sm border">
                                <h2 className="text-2xl font-bold whitespace-nowrap">
                                  {profile.full_name || profile.username}
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
                        <div data-upload-type="avatar">
                          <ImageUpload
                            currentImageUrl={profile.avatar_url}
                            onUpload={handleAvatarUpload}
                            bucket="avatars"
                            folder={profile.user_id}
                            type="logo"
                          />
                        </div>
                        <div data-upload-type="cover">
                          <ImageUpload
                            currentImageUrl={profile.cover_url}
                            onUpload={handleCoverUpload}
                            bucket="user-covers"
                            folder={profile.user_id}
                            type="cover"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Posts */}
              {activeSection === 'posts' && (
                <div className="space-y-6 animate-fade-in">
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-orange-600">
                        <MessagesSquare className="w-5 h-5" />
                        Criar Novo Post
                      </CardTitle>
                      <CardDescription>Compartilhe novidades com seus seguidores</CardDescription>
                    </div>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <Textarea
                          value={postContent}
                          onChange={(e) => setPostContent(e.target.value)}
                          placeholder="No que você está pensando?"
                          className="min-h-[120px] text-base resize-none"
                        />

                        {postImages.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {postImages.map((url, index) => (
                              <div key={index} className="relative group">
                                <img src={url} alt="" className="w-full h-32 object-cover rounded-lg" />
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleRemoveImage(index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            onClick={() => imageInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Adicionar Imagens
                          </Button>
                          <Button
                            className="ml-auto bg-gradient-to-r from-orange-500 to-pink-500"
                            onClick={handleCreatePost}
                            disabled={posting}
                          >
                            {posting ? 'Publicando...' : 'Publicar Post'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <CardHeader>
                      <CardTitle>Meus Posts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {posts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Nenhum post publicado ainda.
                        </div>
                      ) : (
                        posts.map((post) => (
                          <div key={post.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                                {post.media_urls && post.media_urls.length > 0 && (
                                  <div className="grid grid-cols-2 gap-2 mt-3">
                                    {post.media_urls.map((url, index) => (
                                      <img key={index} src={url} alt="" className="w-full h-48 object-cover rounded-lg" />
                                    ))}
                                  </div>
                                )}
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost">
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir Post</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeletePost(post.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                            
                            <div className="flex items-center gap-4 pt-2 border-t text-sm text-muted-foreground">
                              <span>{new Date(post.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Avaliações */}
              {activeSection === 'evaluations' && (
                <div className="space-y-6 animate-fade-in">
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-pink-600">
                        <Star className="w-5 h-5" />
                        Avaliações Recebidas
                      </CardTitle>
                      <CardDescription>Gerencie as avaliações dos seus clientes</CardDescription>
                    </div>
                    <CardContent className="p-6">
                      {evaluations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Nenhuma avaliação recebida ainda.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {evaluations.map((evaluation) => (
                            <div key={evaluation.id} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{evaluation.profiles.full_name}</span>
                                    <div className="flex">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`w-4 h-4 ${
                                            i < evaluation.rating
                                              ? 'fill-yellow-400 text-yellow-400'
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(evaluation.created_at).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-medium mb-1">{evaluation.title}</h4>
                                <p className="text-sm text-muted-foreground">{evaluation.content}</p>
                              </div>

                              {evaluation.public_response ? (
                                <div className="bg-muted/50 rounded-lg p-3 mt-3">
                                  <p className="text-sm font-medium mb-1">Sua resposta:</p>
                                  <p className="text-sm">{evaluation.public_response}</p>
                                </div>
                              ) : (
                                <div className="space-y-2 mt-3">
                                  <Textarea
                                    placeholder="Escreva sua resposta..."
                                    value={responses[evaluation.id] || ''}
                                    onChange={(e) => setResponses({ ...responses, [evaluation.id]: e.target.value })}
                                    rows={3}
                                    className="text-sm resize-none"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleResponseSubmit(evaluation.id)}
                                    disabled={!responses[evaluation.id]?.trim()}
                                  >
                                    Publicar Resposta
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

              {/* Ferramentas */}
              {(activeSection === 'tools' || activeSection.toString().startsWith('tools-')) && (
                <div className="space-y-6 animate-fade-in">
                  {activeSection.toString().startsWith('tools-') ? (
                    <div className="space-y-6">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setActiveSection('tools');
                          setConfiguringFeature(null);
                        }}
                        className="mb-4"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar para Ferramentas
                      </Button>

                      {configuringFeature === 'banner' && (
                        <GenericBannersManager entityId={profile.id} />
                      )}

                      {configuringFeature === 'video' && (
                        <GenericVideoManager profileId={profile.id} />
                      )}

                      {configuringFeature === 'catalog' && (
                        <GenericCatalogManager entityId={profile.id} />
                      )}

                      {configuringFeature === 'testimonials' && (
                        <GenericTestimonialsManager profileId={profile.id} />
                      )}

                      {configuringFeature === 'certifications' && (
                        <GenericCertificationsManager entityId={profile.id} />
                      )}

                      {configuringFeature === 'appointments' && (
                        <GenericAppointmentsManager entityId={profile.id} />
                      )}

                      {configuringFeature === 'linktree' && (
                        <GenericLinktreeManager entityId={profile.id} />
                      )}

                      {configuringFeature === 'vacancies' && (
                        <GenericJobVacanciesManager entityId={profile.id} />
                      )}

                      {configuringFeature === 'portfolio' && (
                        <GenericPortfolioManager entityId={profile.id} />
                      )}

                      {configuringFeature === 'whatsapp' && (
                        <GenericWhatsAppManager profileId={profile.id} />
                      )}

                      {configuringFeature === 'social' && (
                        <GenericSocialManager profileId={profile.id} />
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
                            <div className="text-center py-8 text-muted-foreground">
                              Sistema de negociação em desenvolvimento
                            </div>
                          </CardContent>
                        </Card>
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
                          Ative funcionalidades extras para seu perfil
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
                                    onClick={() => {
                                      setActiveSection(`tools-${feature.key}` as Section);
                                      setConfiguringFeature(feature.key);
                                    }}
                                    className="w-full"
                                  >
                                    Configurar
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
                          <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-primary mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium mb-1">Sobre as Ferramentas</p>
                              <p className="text-sm text-muted-foreground">
                                Ative ferramentas para adicionar funcionalidades ao seu perfil. Você pode configurar cada uma individualmente.
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Informações */}
              {activeSection === 'info' && (
                <div className="space-y-6 animate-fade-in">
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-blue-600">
                        <Info className="w-5 h-5" />
                        Dados Pessoais
                      </CardTitle>
                      <CardDescription>Informações básicas sobre você</CardDescription>
                    </div>
                    <CardContent className="p-6">
                      <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-base font-medium">
                            {profileType === 'business' ? 'Nome da Empresa / Razão Social' : 'Nome Completo'}
                          </Label>
                          <Input
                            value={profile.full_name || ''}
                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                            placeholder={profileType === 'business' ? 'Nome da sua empresa' : 'Seu nome completo'}
                            className="text-base"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-base font-medium">
                            {profileType === 'business' ? 'Descrição da Empresa' : 'Biografia'}
                          </Label>
                          <Textarea
                            value={profile.bio || ''}
                            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                            rows={4}
                            placeholder={profileType === 'business' ? 'Descreva sua empresa...' : 'Conte um pouco sobre você...'}
                            className="text-base resize-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-base font-medium">
                            {profileType === 'business' ? 'Endereço / Localização' : 'Localização'}
                          </Label>
                          <Input
                            value={profile.location || ''}
                            onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                            placeholder={profileType === 'business' ? 'Endereço completo' : 'Cidade, Estado'}
                            className="text-base"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-base font-medium">Website</Label>
                          <Input
                            value={profile.website || ''}
                            onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                            placeholder="https://seusite.com"
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

              {/* Administradores */}
              {activeSection === 'admin' && profileType === 'business' && (
                <div className="space-y-6 animate-fade-in">
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-purple-600">
                        <Shield className="w-5 h-5" />
                        Administradores
                      </CardTitle>
                      <CardDescription>
                        Gerencie quem pode administrar este perfil
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        Funcionalidade em desenvolvimento
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Configurações */}
              {activeSection === 'settings' && (
                <div className="space-y-6 animate-fade-in">
                  <Card className="bg-card/50 backdrop-blur-sm border-2">
                    <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 p-6 border-b">
                      <CardTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="w-5 h-5" />
                        Configurações do Perfil
                      </CardTitle>
                      <CardDescription>Gerencie as configurações da sua conta</CardDescription>
                    </div>
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        {/* Username Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base font-semibold">Username</Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Seu identificador único na plataforma
                              </p>
                            </div>
                          </div>

                          {editingUsername ? (
                            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                              <div className="space-y-2">
                                <Label htmlFor="new-username">Novo Username</Label>
                                <div className="flex gap-2">
                                  <div className="flex-1">
                                    <Input
                                      id="new-username"
                                      value={newUsername}
                                      onChange={(e) => {
                                        const value = e.target.value.toLowerCase();
                                        setNewUsername(value);
                                        if (value) validateUsername(value);
                                      }}
                                      placeholder="Digite o novo username"
                                      className={usernameError ? 'border-red-500' : ''}
                                      disabled={checkingUsername || saving}
                                    />
                                    {usernameError && (
                                      <p className="text-sm text-red-500 mt-1">{usernameError}</p>
                                    )}
                                    {checkingUsername && (
                                      <p className="text-sm text-muted-foreground mt-1">Verificando disponibilidade...</p>
                                    )}
                                    {!usernameError && newUsername && !checkingUsername && newUsername !== profile.username && (
                                      <p className="text-sm text-green-600 mt-1">✓ Username disponível</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {!canChangeUsername(profile.username_last_changed) && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                  <p className="text-sm text-amber-700 dark:text-amber-400">
                                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                                    Você poderá alterar seu username em{' '}
                                    <strong>{getDaysUntilUsernameChange(profile.username_last_changed)} dias</strong>
                                  </p>
                                </div>
                              )}

                              {!profile.username_last_changed && (
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                  <p className="text-sm text-blue-700 dark:text-blue-400">
                                    <Info className="w-4 h-4 inline mr-1" />
                                    Esta é sua primeira alteração de username. Após salvar, você só poderá alterar novamente em 7 dias.
                                  </p>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <Button
                                  onClick={() => setShowUsernameConfirm(true)}
                                  disabled={!newUsername || !!usernameError || checkingUsername || saving || !canChangeUsername(profile.username_last_changed)}
                                  className="flex-1"
                                >
                                  {saving ? 'Salvando...' : 'Salvar Username'}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEditingUsername(false);
                                    setNewUsername('');
                                    setUsernameError('');
                                  }}
                                  disabled={saving}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                              <div>
                                <p className="font-medium">@{profile.username}</p>
                                {!canChangeUsername(profile.username_last_changed) && (
                                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                                    Poderá alterar em {getDaysUntilUsernameChange(profile.username_last_changed)} dias
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingUsername(true);
                                  setNewUsername(profile.username);
                                }}
                                disabled={!canChangeUsername(profile.username_last_changed)}
                              >
                                Alterar
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="p-4 border rounded-lg bg-muted/30">
                          <Info className="w-5 h-5 mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Para alterar seu email ou senha, vá para a página de Conta no menu principal.
                          </p>
                        </div>
                      </div>
                    </CardContent>

                    {/* Confirmation Dialog */}
                    <AlertDialog open={showUsernameConfirm} onOpenChange={setShowUsernameConfirm}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar alteração de username</AlertDialogTitle>
                          <AlertDialogDescription>
                            Você está prestes a alterar seu username de <strong>@{profile.username}</strong> para <strong>@{newUsername}</strong>.
                            <br /><br />
                            {!profile.username_last_changed ? (
                              <span className="text-amber-600 dark:text-amber-400">
                                Esta é sua primeira alteração. Após confirmar, você só poderá alterar novamente em 7 dias.
                              </span>
                            ) : (
                              <span>
                                Após confirmar, você só poderá alterar novamente em 7 dias.
                              </span>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleUsernameChange}>
                            Confirmar alteração
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
