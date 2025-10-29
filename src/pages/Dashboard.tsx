import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Star, Search, Briefcase, MessageSquare, CheckCircle2, Phone, Building2, Users, UserPlus, ThumbsUp, MessageCircle, Award, Activity, TrendingUp, Bell, Clock, Trophy, Share2, Heart, Bookmark, Camera, Mail, FileCheck, Settings, Eye, User } from 'lucide-react';
import woorkoinsIcon from '@/assets/woorkoins-icon-latest.png';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { SearchSlideIn } from '@/components/SearchSlideIn';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatShortName } from '@/lib/utils';
import { ProfileEditDialog } from '@/components/ProfileEditDialog';
import { ProfilePhotoUploadDialog } from '@/components/ProfilePhotoUploadDialog';
import { IdentityVerificationDialog } from '@/components/IdentityVerificationDialog';
import { CreateBusinessProfileDialog } from '@/components/CreateBusinessProfileDialog';
import { FollowingSection } from '@/components/dashboard/FollowingSection';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { StoriesCarousel } from '@/components/stories/StoriesCarousel';
import { CreateStoryDialog } from '@/components/stories/CreateStoryDialog';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from '@/components/ui/skeleton';
import confetti from 'canvas-confetti';
interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  document_verified: boolean;
  cpf: string | null;
}

interface BusinessProfile {
  id: string;
  company_name: string;
  category: string | null;
  logo_url: string | null;
  slug: string | null;
}

interface FeedPost {
  id: string;
  author_name: string;
  author_role: string;
  author_avatar: string;
  time_ago: string;
  content: string;
  image_url?: string;
  likes: number;
  comments: number;
  business_id: string;
  author_username?: string;
  author_profile_link: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: 'star' | 'user' | 'award';
  iconColor: string;
  time_ago: string;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  icon: 'info' | 'user' | 'star' | 'award' | 'message';
  iconColor: string;
  time_ago: string;
}

interface Notification {
  id: string;
  title: string;
  description: string;
  time_ago: string;
  icon: 'message' | 'star' | 'user' | 'briefcase';
  iconColor: string;
  read: boolean;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [lastUnreadMessage, setLastUnreadMessage] = useState<string>('');
  const [woorkoinsBalance, setWoorkoinsBalance] = useState(0);
  
  // Usar hook de mensagens não lidas
  const unreadMessages = useUnreadMessages(profile?.id || '');
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showCreateBusinessDialog, setShowCreateBusinessDialog] = useState(false);
  const [showPhotoUploadDialog, setShowPhotoUploadDialog] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [hasShownConfetti, setHasShownConfetti] = useState(() => {
    // Verificar se já foi mostrado anteriormente
    return localStorage.getItem('woorkins_confetti_shown') === 'true';
  });
  
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showCommentsForPost, setShowCommentsForPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const [followingProfiles, setFollowingProfiles] = useState<Set<string>>(new Set());
  const [profileFollowers, setProfileFollowers] = useState<Record<string, number>>({});
  const [showEvaluateDialog, setShowEvaluateDialog] = useState(false);
  const [availableProfiles, setAvailableProfiles] = useState<Array<{ id: string; username: string; full_name: string | null; avatar_url: string | null; type: 'user' | 'business'; company_name?: string; slug?: string }>>([]);
  const [profileSearchQuery, setProfileSearchQuery] = useState('');
  const [showSearchSlideIn, setShowSearchSlideIn] = useState(false);
  const [showCreateStoryDialog, setShowCreateStoryDialog] = useState(false);
  const [storiesRefreshTrigger, setStoriesRefreshTrigger] = useState(0);

  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'Primeira Avaliação',
      description: 'Escreveu sua primeira avaliação',
      icon: 'star',
      iconColor: 'bg-blue-500',
      time_ago: '2 dias atrás'
    },
    {
      id: '2',
      title: 'Membro Confiável',
      description: 'Alcançou nível Prata',
      icon: 'user',
      iconColor: 'bg-teal-500',
      time_ago: '1 semana atrás'
    },
    {
      id: '3',
      title: 'Socialização',
      description: 'Conseguiu 100+ seguidores',
      icon: 'award',
      iconColor: 'bg-orange-500',
      time_ago: '2 semanas atrás'
    }
  ];

  const activities: Activity[] = [
    {
      id: '1',
      title: 'Você escreveu uma avaliação para',
      description: 'TechSolutions Brasil',
      icon: 'info',
      iconColor: 'bg-blue-500',
      time_ago: '30m atrás'
    },
    {
      id: '2',
      title: 'Maria Santos começou a seguir você',
      description: '',
      icon: 'user',
      iconColor: 'bg-teal-500',
      time_ago: '2h atrás'
    },
    {
      id: '3',
      title: 'Marketing Digital Pro respondeu a sua avaliação',
      description: 'Profissional de Marketing Digital',
      icon: 'star',
      iconColor: 'bg-blue-500',
      time_ago: '4h atrás'
    },
    {
      id: '4',
      title: 'Você ganhou a medalha "Avaliador Confiável"',
      description: '',
      icon: 'award',
      iconColor: 'bg-orange-500',
      time_ago: '8h atrás'
    },
    {
      id: '5',
      title: 'Nova mensagem de Carlos Rodriguez',
      description: '',
      icon: 'message',
      iconColor: 'bg-orange-500',
      time_ago: '12h atrás'
    }
  ];

  const notifications: Notification[] = [
    {
      id: '1',
      title: 'Nova mensagem de Sarah Johnson',
      description: 'Olá! Vi seu portfólio e gostaria de discutir um possível projeto...',
      time_ago: '15m atrás',
      icon: 'message',
      iconColor: 'bg-blue-500',
      read: false
    },
    {
      id: '2',
      title: 'Solicitação de avaliação aprovada',
      description: 'Sua avaliação para TechCorp foi publicada',
      time_ago: '1h atrás',
      icon: 'star',
      iconColor: 'bg-yellow-500',
      read: false
    },
    {
      id: '3',
      title: 'Novo seguidor',
      description: 'Maria Santos começou a seguir você',
      time_ago: '2h atrás',
      icon: 'user',
      iconColor: 'bg-teal-500',
      read: true
    },
    {
      id: '4',
      title: 'Empresa respondeu à sua avaliação',
      description: 'Profissional de Marketing Digital agradece você',
      time_ago: '4h atrás',
      icon: 'star',
      iconColor: 'bg-blue-500',
      read: true
    }
  ];
  useEffect(() => {
    document.title = 'Painel - Woorkins';
  }, []);

  useEffect(() => {
    if (user) {
      loadProfile();
      checkEmailConfirmation();
    }
  }, [user]);

  // Carregar dados apenas uma vez quando o profile é carregado
  useEffect(() => {
    if (profile) {
      loadPendingInvites();
      loadLastUnreadMessage();
    }
  }, [profile?.id]); // Apenas quando o ID muda

  const loadPendingInvites = async () => {
    if (!profile) return;
    
    const { count, error } = await supabase
      .from('profile_admins')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .eq('status', 'pending');
    
    if (!error && count !== null) {
      setPendingInvitesCount(count);
    }
  };

  const loadLastUnreadMessage = async () => {
    if (!profile) return;
    
    setLoadingMessages(true);
    try {
      // Buscar mensagens mais recentes de ambos os tipos em paralelo
      const [negMessages, propMessages] = await Promise.all([
        supabase
          .from('negotiation_messages')
          .select('content, created_at')
          .neq('sender_id', profile.id)
          .is('read_at', null)
          .eq('moderation_status', 'approved')
          .neq('is_deleted', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        supabase
          .from('proposal_messages')
          .select('content, created_at')
          .neq('sender_id', profile.id)
          .is('read_at', null)
          .eq('moderation_status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      // Pegar a mensagem mais recente entre as duas
      const lastMessage = negMessages.data && propMessages.data
        ? (new Date(negMessages.data.created_at) > new Date(propMessages.data.created_at) 
            ? negMessages.data 
            : propMessages.data)
        : (negMessages.data || propMessages.data);

      if (lastMessage?.content) {
        const preview = lastMessage.content.length > 50 
          ? lastMessage.content.substring(0, 50) + '...'
          : lastMessage.content;
        setLastUnreadMessage(preview);
      } else {
        setLastUnreadMessage('');
      }
    } catch (error) {
      console.error('Error loading last unread message:', error);
      setLastUnreadMessage('');
    } finally {
      setLoadingMessages(false);
    }
  };

  const checkEmailConfirmation = async () => {
    if (!user) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setEmailConfirmed(!!authUser?.email_confirmed_at);
  };
  
  const loadProfile = async () => {
    if (!user) return;
    
    setLoadingProfile(true);
    try {
      const { getOrCreateUserProfile } = await import('@/lib/profiles');
      const profiles = await getOrCreateUserProfile(user);
      
      if (profiles && profiles.length > 0) {
        const userProfile = profiles.find((p: any) => p.profile_type === 'user') || profiles[0];
        const profileData = userProfile as unknown as Profile;
        
        setProfile(profileData);
        
        // Executar operações em paralelo SEM aguardar fixUsernameSlugConflict
        Promise.all([
          loadBusinessProfiles(profileData.id),
          loadWoorkoinsBalanceForIds(profiles.map((p: any) => p.id))
        ]);
        
        // Executar fix de conflitos em background (não bloqueia)
        fixUsernameSlugConflict(profileData, profiles).catch(console.error);
      } else {
        toast({
          title: 'Erro ao criar perfil',
          description: 'Não foi possível criar seu perfil. Tente fazer logout e login novamente.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[Dashboard] Error in loadProfile:', error);
      toast({
        title: 'Erro ao carregar perfil',
        description: 'Não foi possível carregar seu perfil. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const fixUsernameSlugConflict = async (userProfile: Profile, allProfiles: any[]) => {
    try {
      const businessProfiles = allProfiles.filter((p: any) => p.profile_type === 'business');
      
      for (const business of businessProfiles) {
        // Se username do user colide com slug do business
        if (userProfile.username === business.slug) {
          let needsUpdate = false;
          const updates: any = {};
          console.warn('[Dashboard] Conflito detectado! username:', userProfile.username, 'slug:', business.slug);
          
          // Tentar slugs alternativos para o business
          const baseSlugs = [`${business.slug}-oficial`, `${business.slug}-empresa`, `${business.slug}1`];
          let newSlug = null;
          
          for (const candidate of baseSlugs) {
            const { data: existingSlug } = await supabase
              .from('profiles')
              .select('slug')
              .eq('slug', candidate)
              .maybeSingle();
            
            if (!existingSlug) {
              newSlug = candidate;
              break;
            }
          }
          
          if (newSlug) {
            updates.slug = newSlug;
            needsUpdate = true;
            
            // Aplicar updates
            const { error } = await supabase
              .from('profiles')
              .update(updates)
              .eq('id', business.id);
            
            if (error) {
              console.error('[Dashboard] Erro ao atualizar perfil business:', error);
            } else {
              console.log('[Dashboard] Perfil business atualizado:', business.id, updates);
              toast({
                title: 'Conflito resolvido',
                description: `O @ do seu perfil profissional foi ajustado para @${newSlug} para evitar conflitos.`,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('[Dashboard] Error fixing conflicts:', error);
    }
  };

  // Calcular tarefas de conclusão do perfil
  const getProfileTasks = () => {
    if (!profile) return { tasks: [], completion: 0 };

    const tasks = [
      {
        id: 'photo',
        title: 'Foto de perfil',
        icon: Camera,
        completed: !!profile.avatar_url,
        action: () => {
          if (!user || !profile) {
            toast({
              title: 'Erro',
              description: 'Não foi possível abrir o upload de foto. Tente novamente.',
              variant: 'destructive',
            });
            return;
          }
          setShowPhotoUploadDialog(true);
        },
      },
      {
        id: 'email',
        title: 'Confirmação de email',
        icon: Mail,
        completed: emailConfirmed,
        action: async () => {
          try {
            const { error } = await supabase.auth.resend({
              type: 'signup',
              email: user?.email || '',
            });
            if (!error) {
              alert('Email de confirmação enviado! Verifique sua caixa de entrada.');
            }
          } catch (error) {
            console.error('Error resending email:', error);
          }
        },
      },
      {
        id: 'verification',
        title: 'Verificação',
        icon: FileCheck,
        completed: profile.document_verified || false,
        action: () => setShowVerificationDialog(true),
      },
    ];

    const completedCount = tasks.filter(t => t.completed).length;
    const completion = Math.round((completedCount / tasks.length) * 100);

    return { tasks, completion };
  };

  const { tasks: profileTasks, completion: profileCompletion } = getProfileTasks();
  const pendingTasks = profileTasks.filter(t => !t.completed);
  const profileCompleted = profileTasks.every(t => t.completed);
  
  // Reordenar tarefas: pendentes primeiro, concluídas depois
  const orderedTasks = [...pendingTasks, ...profileTasks.filter(t => t.completed)];

  // Animação de confete quando completar tudo (apenas uma vez)
  useEffect(() => {
    const allCompleted = profileTasks.every(t => t.completed);
    if (allCompleted && !hasShownConfetti && !loadingProfile) {
      // Disparar confete
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#3b82f6', '#10b981', '#f59e0b'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#3b82f6', '#10b981', '#f59e0b'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Marcar como mostrado no localStorage permanentemente
      localStorage.setItem('woorkins_confetti_shown', 'true');
      setHasShownConfetti(true);
    }
  }, [profileTasks, hasShownConfetti, loadingProfile]);


  // Soma o saldo de Woorkoins de todos os perfis do usuário
  const loadWoorkoinsBalanceForIds = async (profileIds: string[]) => {
    if (!profileIds?.length) return;
    setLoadingBalance(true);
    try {
      const { data, error } = await supabase
        .from('woorkoins_balance')
        .select('profile_id, balance')
        .in('profile_id', profileIds);

      if (!error && data) {
        const total = data.reduce((sum: number, r: any) => sum + (r.balance || 0), 0);
        setWoorkoinsBalance(total);
      }
    } catch (error) {
      console.error('Error loading woorkoins balance:', error);
      setWoorkoinsBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  const loadAvailableProfiles = async () => {
    if (!profile) return;
    
    try {
      // Buscar usuários (excluindo o próprio usuário)
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .neq('id', profile.id)
        .limit(50);

      // Buscar perfis de negócios (excluindo os do usuário)
      const { data: businesses, error: businessesError } = await supabase
      .from('profiles')
      .select('id, company_name, logo_url, slug')
      .eq('profile_type', 'business')
        .neq('id', profile.id)
        .limit(50);

      const userProfiles = (users || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        type: 'user' as const
      }));

      const businessProfiles = (businesses || []).map((b: any) => ({
        id: b.id,
        username: b.slug || b.company_name,
        full_name: null,
        avatar_url: b.logo_url,
        company_name: b.company_name,
        slug: b.slug,
        type: 'business' as const
      }));

      setAvailableProfiles([...userProfiles, ...businessProfiles]);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const loadBusinessProfiles = async (profileId: string) => {
    const { data, error } = await supabase
    .from('profiles' as any)
    .select('id, company_name, category, logo_url, slug, username')
    .eq('user_id', user?.id)
      .eq('profile_type', 'business');
    
    if (!error && data) {
      setBusinessProfiles(data as unknown as BusinessProfile[]);
    }
  };

  const loadFeedPosts = async () => {
    if (!profile) return;
    
    setLoadingPosts(true);
    try {
      // Buscar posts sem relacionamento (não há FK configurada no banco)
      const { data: posts, error } = await supabase
        .from('profile_posts')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Buscar perfis autores dos posts manualmente
      const profileIds = Array.from(new Set((posts || []).map((p: any) => p.profile_id).filter(Boolean)));
      let profilesById: Record<string, any> = {};
      if (profileIds.length) {
        const { data: authors } = await supabase
          .from('profiles' as any)
          .select('id, full_name, username, avatar_url, company_name, logo_url, slug, profile_type')
          .in('id', profileIds);
        profilesById = Object.fromEntries((authors || []).map((a: any) => [a.id, a]));
      }

      const postsWithStats = (posts || []).map((post: any) => {
        const postProfile = profilesById[post.profile_id] || {};

        // Calcular "tempo atrás"
        const createdAt = new Date(post.created_at);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
        let timeAgo = '';
        if (diffInMinutes < 60) {
          timeAgo = `${diffInMinutes}m atrás`;
        } else if (diffInMinutes < 1440) {
          timeAgo = `${Math.floor(diffInMinutes / 60)}h atrás`;
        } else {
          timeAgo = `${Math.floor(diffInMinutes / 1440)}d atrás`;
        }

        const isBusiness = postProfile?.profile_type === 'business';
        const authorLink = isBusiness
          ? (postProfile?.slug ? `/${postProfile.slug}` : '#')
          : (postProfile?.username ? `/${postProfile.username}` : '#');

        return {
          id: post.id,
          author_name: postProfile?.company_name || postProfile?.full_name || 'Usuário',
          author_role: 'Profissional',
          author_avatar: postProfile?.logo_url || postProfile?.avatar_url || '',
          time_ago: timeAgo,
          content: post.content,
          image_url: post.media_urls?.[0] || undefined,
          likes: 0,
          comments: 0,
          business_id: postProfile?.id || '',
          author_username: isBusiness ? postProfile?.slug : postProfile?.username,
          author_profile_link: authorLink
        } as FeedPost;
      });

      setFeedPosts(postsWithStats);
    } catch (error) {
      console.error('Error loading feed posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };
  const handleLikePost = async (postId: string) => {
    if (!profile) return;

    try {
      // Funcionalidade de likes removida - tabela não existe ainda
      toast({
        title: "Em breve",
        description: "Funcionalidade de likes será implementada em breve",
      });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const loadPostComments = async (postId: string) => {
    try {
      // Funcionalidade de comentários removida - tabela não existe ainda
      setPostComments(prev => ({ ...prev, [postId]: [] }));
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!profile || !commentText.trim()) return;

    try {
      // Funcionalidade de comentários removida - tabela não existe ainda
      toast({
        title: "Em breve",
        description: "Funcionalidade de comentários será implementada em breve",
      });
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleFollowProfile = async (targetProfileId: string) => {
    if (!profile) return;

    try {
      const isFollowing = followingProfiles.has(targetProfileId);

      if (isFollowing) {
        // Deixar de seguir
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', profile.id)
          .eq('following_id', targetProfileId);
        
        setFollowingProfiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(targetProfileId);
          return newSet;
        });
      } else {
        // Seguir
        await supabase
          .from('follows')
          .insert({
            follower_id: profile.id,
            following_id: targetProfileId
          });
        
        setFollowingProfiles(prev => new Set(prev).add(targetProfileId));
      }

      // Recarregar contador de seguidores
      loadFollowers();
    } catch (error) {
      console.error('Error following/unfollowing:', error);
    }
  };

  const handleSharePost = (postId: string) => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url);
    alert('Link copiado para a área de transferência!');
  };

  const loadFollowers = async () => {
    try {
      // Carregar quem o usuário está seguindo
      if (profile) {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', profile.id);

        if (following) {
          setFollowingProfiles(new Set(following.map(f => f.following_id)));
        }
      }

      // Carregar contadores de seguidores para os perfis dos posts
      const { data: posts } = await supabase
        .from('profile_posts')
        .select('profile_id')
        .limit(20);

      if (posts) {
        const profileIds = [...new Set(posts.map((p: any) => p.profile_id).filter(Boolean))];
        
        const followerCounts: Record<string, number> = {};
        for (const profileId of profileIds) {
          const { count } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', profileId);
          
          followerCounts[profileId] = count || 0;
        }
        
        setProfileFollowers(followerCounts);
      }
    } catch (error) {
      console.error('Error loading followers:', error);
    }
  };

  useEffect(() => {
    if (profile) {
      loadFeedPosts();
      loadFollowers();
    }
  }, [profile]);
  // Remover bloqueio de renderização - mostrar estrutura imediatamente

  const accountType = 'Conta Grátis';
  const points = 1250;
  const maxPoints = 2000;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      {loadingProfile ? (
        <DashboardSkeleton />
      ) : (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-8 space-y-6">
              {/* Welcome Section */}
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 mb-2">
                        Bem-vindo de volta, {formatShortName(profile?.full_name) || profile?.username}! 👋
                      </h1>
                      <div className="flex items-center gap-3 mt-2">
                        <Link to="/planos">
                          <Badge 
                            variant="secondary" 
                            className="text-xs px-3 py-1 bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                          >
                            <Award className="w-3 h-3 mr-1" />
                            {accountType}
                          </Badge>
                        </Link>
                        <Link 
                          to="/woorkoins" 
                          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary transition-colors cursor-pointer group"
                        >
                          <img src={woorkoinsIcon} alt="Woorkoins" className="h-5 w-auto object-contain group-hover:scale-110 transition-transform" />
                          {loadingBalance ? (
                            <Skeleton className="h-5 w-16" />
                          ) : (
                            <>
                              <span className="font-semibold">{woorkoinsBalance.toLocaleString()}</span>
                              <span>Woorkoins</span>
                            </>
                          )}
                        </Link>
                      </div>
                    </div>
                  {!profileCompleted && (
                    <div className="text-right">
                      <div className="text-xs text-slate-600 mb-1">Conclusão do Perfil</div>
                      <div className="text-xl font-bold text-primary">{profileCompletion}%</div>
                    </div>
                  )}
                </div>
                
                {!profileCompleted && (
                  <>
                    <Progress value={profileCompletion} className="h-2 mb-4" />

                    {/* Profile Completion Tasks */}
                    {pendingTasks.length > 0 ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 animate-fade-in">
                        <div className="flex items-start gap-2 mb-3">
                          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                          <p className="text-sm font-medium text-slate-900">
                            Complete seu perfil para desbloquear mais recursos
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 ml-8">
                          {orderedTasks.map((task) => (
                            <Button
                              key={task.id}
                              variant="outline"
                              size="sm"
                              className={
                                task.completed
                                  ? "text-xs h-7 border-green-500 text-green-600 bg-green-50 cursor-default"
                                  : "text-xs h-7 border-slate-300 hover:border-primary hover:text-primary"
                              }
                              onClick={task.completed ? undefined : task.action}
                              disabled={task.completed}
                            >
                              {task.completed ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  {task.title} - Concluído
                                </>
                              ) : (
                                <>
                                  <task.icon className="w-3 h-3 mr-1" />
                                  {task.title}
                                </>
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 animate-scale-in">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-green-900 mb-1">
                              🎉 Parabéns! Perfil Completo!
                            </h3>
                            <p className="text-sm text-green-700">
                              Você completou todas as informações importantes para usar o Woorkins!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Pending Admin Invites Alert */}
            {pendingInvitesCount > 0 && (
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 shadow-md animate-fade-in">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-purple-900 mb-1">
                        {pendingInvitesCount === 1 
                          ? '1 Convite Pendente' 
                          : `${pendingInvitesCount} Convites Pendentes`}
                      </h3>
                      <p className="text-sm text-purple-700 mb-3">
                        Você foi convidado para administrar {pendingInvitesCount === 1 ? 'um perfil de negócio' : 'perfis de negócios'}. 
                        Revise e responda aos convites.
                      </p>
                      <Link to="/admin-invites">
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                          Ver Convites
                          <Bell className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stories Carousel */}
            {profile && (
              <StoriesCarousel
                currentProfile={{
                  id: profile.id,
                  username: profile.username,
                  full_name: profile.full_name || '',
                  avatar_url: profile.avatar_url || undefined,
                }}
                onCreateStory={() => setShowCreateStoryDialog(true)}
              />
            )}

            {/* Action Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card 
                className="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                onClick={() => setShowCreateStoryDialog(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                <CardContent className="p-5 relative z-10">
                  <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform backdrop-blur-sm">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-0.5">Postar Stories</h3>
                  <p className="text-white/90 text-xs">Compartilhe seu dia</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group relative">
                <Link to="/mensagens">
                  <CardContent className="p-5">
                    {unreadMessages > 0 && (
                      <Badge className="absolute top-3 right-3 bg-red-500 text-white border-0 min-w-[28px] h-7 flex items-center justify-center px-2 text-sm font-bold shadow-lg">
                        {unreadMessages}
                      </Badge>
                    )}
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-0.5">Ver Mensagens</h3>
                    <p className="text-green-100 text-xs line-clamp-2">
                      {unreadMessages > 0 
                        ? (lastUnreadMessage || 'Nova mensagem não lida')
                        : 'Nenhuma mensagem não lida'}
                    </p>
                  </CardContent>
                </Link>
              </Card>

              <Card 
                className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => {
                  loadAvailableProfiles();
                  setShowEvaluateDialog(true);
                }}
              >
                <CardContent className="p-5">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-0.5">Escrever Avaliação</h3>
                  <p className="text-blue-100 text-xs">Compartilhe sua experiência</p>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-to-br from-teal-500 to-teal-600 border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setShowSearchSlideIn(true)}
              >
                <CardContent className="p-5">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-0.5">Encontrar Serviços</h3>
                  <p className="text-teal-100 text-xs">Descubra negócios</p>
                </CardContent>
              </Card>
            </div>

            {/* Social Feed */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-700" />
                  <h2 className="text-base font-bold text-slate-900">Feed social</h2>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingPosts ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : feedPosts.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    Nenhuma postagem ainda. Seja o primeiro a compartilhar!
                  </div>
                ) : (
                  <>
                    {feedPosts.map((post) => {
                      const postAuthorProfileId = post.business_id; // Assuming business_id maps to profile
                      const isFollowing = followingProfiles.has(postAuthorProfileId);
                      const followerCount = profileFollowers[postAuthorProfileId] || 0;
                      
                      return (
                        <div key={post.id} className="p-4 border-b border-slate-100 last:border-0">
                          <div className="flex items-start gap-3">
                            <Link to={post.author_profile_link}>
                              <Avatar className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity">
                                <AvatarImage src={post.author_avatar} />
                                <AvatarFallback className="bg-slate-200 text-slate-600 text-sm">
                                  <User className="w-5 h-5" />
                                </AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <div>
                                  <Link to={post.author_profile_link}>
                                    <h4 className="font-semibold text-sm text-slate-900 hover:text-primary cursor-pointer transition-colors">
                                      {post.author_name}
                                    </h4>
                                  </Link>
                                  <p className="text-xs text-slate-600">
                                    {post.author_role} • {post.time_ago} • {followerCount} seguidores
                                  </p>
                                </div>
                                {postAuthorProfileId !== profile?.id && (
                                  <Button 
                                    variant={isFollowing ? "outline" : "default"}
                                    size="sm" 
                                    className="h-7 text-xs px-3"
                                    onClick={() => handleFollowProfile(postAuthorProfileId)}
                                  >
                                    {isFollowing ? 'Seguindo' : 'Seguir'}
                                  </Button>
                                )}
                              </div>
                              <p className="text-sm text-slate-700 mb-2 leading-relaxed">{post.content}</p>
                              {post.image_url && (
                                <img 
                                  src={post.image_url} 
                                  alt="Post content" 
                                  className="w-full h-48 object-cover rounded-lg mb-2"
                                />
                              )}
                              <div className="flex items-center gap-4 text-xs text-slate-600 mb-2">
                                <button 
                                  onClick={() => handleLikePost(post.id)}
                                  className="flex items-center gap-1 hover:text-red-500 transition-colors"
                                >
                                  <Heart className="w-4 h-4" />
                                  <span>{post.likes}</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    if (showCommentsForPost === post.id) {
                                      setShowCommentsForPost(null);
                                    } else {
                                      setShowCommentsForPost(post.id);
                                      loadPostComments(post.id);
                                    }
                                  }}
                                  className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  <span>{post.comments}</span>
                                </button>
                                <button 
                                  onClick={() => handleSharePost(post.id)}
                                  className="flex items-center gap-1 hover:text-green-500 transition-colors"
                                >
                                  <Share2 className="w-4 h-4" />
                                  <span>Compartilhar</span>
                                </button>
                                <button className="ml-auto hover:text-blue-500 transition-colors">
                                  <Bookmark className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Seção de comentários */}
                              {showCommentsForPost === post.id && (
                                <div className="mt-3 space-y-3">
                                  {/* Input para novo comentário */}
                                  <div className="flex gap-2">
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={profile?.avatar_url || ''} />
                                      <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                                        <User className="w-4 h-4" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 flex gap-2">
                                      <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Escreva um comentário..."
                                        className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                            handleAddComment(post.id);
                                          }
                                        }}
                                      />
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleAddComment(post.id)}
                                        disabled={!commentText.trim()}
                                        className="h-8"
                                      >
                                        Enviar
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Lista de comentários */}
                                  {postComments[post.id]?.map((comment: any) => (
                                    <div key={comment.id} className="flex gap-2">
                                      <Avatar className="w-8 h-8">
                                        <AvatarImage src={comment.profiles?.avatar_url || ''} />
                                        <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                                          <User className="w-4 h-4" />
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 bg-slate-50 rounded-lg p-2">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-semibold text-xs text-slate-900">
                                            {comment.profiles?.full_name || comment.profiles?.username}
                                          </span>
                                          <span className="text-xs text-slate-500">
                                            {new Date(comment.created_at).toLocaleDateString('pt-BR')}
                                          </span>
                                        </div>
                                        <p className="text-sm text-slate-700">{comment.content}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="p-4 text-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-sm"
                        onClick={loadFeedPosts}
                      >
                        Carregar mais postagens
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            {/* Personal Profile Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm border-2 border-blue-200">
              <CardHeader className="border-b border-blue-200 p-4 bg-white/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Seu Perfil</h3>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-blue-300 bg-white hover:shadow-md transition-all">
                  <Avatar className="h-10 w-10 border-2 border-blue-400">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={profile.username} />
                    ) : (
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 truncate">
                      {formatShortName(profile?.full_name) || profile?.username}
                    </h4>
                    <p className="text-xs text-slate-600 truncate">@{profile?.username}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link to={`/${profile?.username}`}>
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-blue-400 text-blue-600 hover:bg-blue-50">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Link to="/perfil/editar">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="text-xs h-7 px-2 bg-blue-500 hover:bg-blue-600"
                      >
                        Editar
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Profiles Card */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Perfis Profissionais</h3>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setShowCreateBusinessDialog(true)}>
                    + Criar Perfil
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {businessProfiles.length === 0 ? (
                  <div className="text-center py-6">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 mb-3">Você pode criar outros perfis profissionais</p>
                    <Button variant="default" size="sm" onClick={() => setShowCreateBusinessDialog(true)}>
                      Criar novo perfil
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {businessProfiles.map((business) => (
                      <div 
                        key={business.id} 
                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:shadow-sm transition-all"
                      >
                        {business.logo_url ? (
                          <img 
                            src={business.logo_url} 
                            alt={business.company_name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-slate-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-slate-900 truncate">
                            {business.company_name}
                          </h4>
                          <p className="text-xs text-slate-600 truncate">
                            @{(business as any).username || business.slug}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Link to={`/${(business as any).username || business.slug || business.id}`}>
                            <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Link to={`/settings/profile/${business.id}`}>
                            <Button variant="default" size="sm" className="text-xs h-7 px-3">
                              Editar
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Following Section */}
            {profile && (
              <FollowingSection profileId={profile.id} />
            )}

            {/* Statistics Card */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 p-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Suas Estatísticas</h3>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Star className="w-4 h-4 text-yellow-600" />
                    </div>
                    <span className="text-sm text-slate-700">Avaliações Dadas</span>
                  </div>
                  <span className="text-xl font-bold text-slate-900">23</span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm text-slate-700">Avaliações Recebidas</span>
                  </div>
                  <span className="text-xl font-bold text-slate-900">18</span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-sm text-slate-700">Seguidores</span>
                  </div>
                  <span className="text-xl font-bold text-slate-900">156</span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-sm text-slate-700">Seguindo</span>
                  </div>
                  <span className="text-xl font-bold text-slate-900">89</span>
                </div>
              </CardContent>
            </Card>

            {/* Achievements Card */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 p-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-orange-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Conquistas Recentes</h3>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 ${achievement.iconColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      {achievement.icon === 'star' && <Star className="w-4 h-4 text-white" />}
                      {achievement.icon === 'user' && <Users className="w-4 h-4 text-white" />}
                      {achievement.icon === 'award' && <Award className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900">{achievement.title}</h4>
                      <p className="text-xs text-slate-600">{achievement.description}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{achievement.time_ago}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activity Card */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 p-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Atividade recente</h3>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 ${activity.iconColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      {activity.icon === 'info' && <Activity className="w-4 h-4 text-white" />}
                      {activity.icon === 'user' && <Users className="w-4 h-4 text-white" />}
                      {activity.icon === 'star' && <Star className="w-4 h-4 text-white" />}
                      {activity.icon === 'award' && <Award className="w-4 h-4 text-white" />}
                      {activity.icon === 'message' && <MessageSquare className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">
                        {activity.title}
                        {activity.description && (
                          <span className="font-semibold"> {activity.description}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{activity.time_ago}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Notifications Card */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Bell className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Notificações</h3>
                    <Badge className="bg-red-500 text-white border-0 text-xs px-1.5">2</Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    Marcar tudo como lido
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="todos" className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b border-slate-100 bg-transparent p-0 h-auto">
                    <TabsTrigger value="todos" className="text-xs px-4 py-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                      Todos
                    </TabsTrigger>
                    <TabsTrigger value="nao-lido" className="text-xs px-4 py-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                      Não lido
                    </TabsTrigger>
                    <TabsTrigger value="mensagens" className="text-xs px-4 py-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                      Mensagens
                    </TabsTrigger>
                    <TabsTrigger value="avaliacoes" className="text-xs px-4 py-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                      Avaliações
                    </TabsTrigger>
                    <TabsTrigger value="seguir" className="text-xs px-4 py-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                      Seguir
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="todos" className="mt-0">
                    <ScrollArea className="h-80">
                      <div className="space-y-0">
                        {notifications.map((notification) => (
                          <div 
                            key={notification.id} 
                            className={`p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 ${notification.iconColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                {notification.icon === 'message' && <MessageSquare className="w-4 h-4 text-white" />}
                                {notification.icon === 'star' && <Star className="w-4 h-4 text-white" />}
                                {notification.icon === 'user' && <Users className="w-4 h-4 text-white" />}
                                {notification.icon === 'briefcase' && <Briefcase className="w-4 h-4 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-slate-900">{notification.title}</h4>
                                <p className="text-xs text-slate-600 mt-0.5">{notification.description}</p>
                                <p className="text-xs text-slate-500 mt-1">{notification.time_ago} {!notification.read && '🔵'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="nao-lido" className="mt-0">
                    <ScrollArea className="h-80">
                      <div className="space-y-0">
                        {notifications.filter(n => !n.read).map((notification) => (
                          <div 
                            key={notification.id} 
                            className="p-4 border-b border-slate-100 last:border-0 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 ${notification.iconColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                {notification.icon === 'message' && <MessageSquare className="w-4 h-4 text-white" />}
                                {notification.icon === 'star' && <Star className="w-4 h-4 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-slate-900">{notification.title}</h4>
                                <p className="text-xs text-slate-600 mt-0.5">{notification.description}</p>
                                <p className="text-xs text-slate-500 mt-1">{notification.time_ago} 🔵</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="mensagens" className="mt-0">
                    <div className="p-8 text-center text-slate-500 text-sm">
                      Nenhuma mensagem
                    </div>
                  </TabsContent>
                  <TabsContent value="avaliacoes" className="mt-0">
                    <div className="p-8 text-center text-slate-500 text-sm">
                      Nenhuma avaliação
                    </div>
                  </TabsContent>
                  <TabsContent value="seguir" className="mt-0">
                    <div className="p-8 text-center text-slate-500 text-sm">
                      Nenhuma atividade de seguir
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      )}

      {/* Dialog de edição de perfil */}
      {user && profile && (
        <>
          <ProfileEditDialog
            open={showProfileEdit}
            onOpenChange={(open) => {
              setShowProfileEdit(open);
              // Quando fechar, recarregar perfis para pegar slugs atualizados
              if (!open && profile) {
                loadProfile();
                loadBusinessProfiles(profile.id);
              }
            }}
            userId={user.id}
            profileId={profile.id}
            onUpdate={loadProfile}
          />
          <IdentityVerificationDialog
            open={showVerificationDialog}
            onOpenChange={setShowVerificationDialog}
            profileId={profile.id}
            registeredName={profile.full_name || ''}
            registeredCPF={profile.cpf || ''}
          />
          <CreateBusinessProfileDialog
            open={showCreateBusinessDialog}
            onOpenChange={setShowCreateBusinessDialog}
            onSuccess={() => profile && loadBusinessProfiles(profile.id)}
          />
          <ProfilePhotoUploadDialog
            open={showPhotoUploadDialog}
            onOpenChange={setShowPhotoUploadDialog}
            currentPhotoUrl={profile.avatar_url || ''}
            userName={user?.user_metadata?.full_name || 'Usuário'}
            profileId={profile.id}
            onPhotoUpdated={loadProfile}
          />
        </>
      )}

      {/* Dialog de seleção de perfil para avaliar */}
      <Dialog open={showEvaluateDialog} onOpenChange={setShowEvaluateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Selecionar Perfil para Avaliar</DialogTitle>
            <DialogDescription>
              Escolha um perfil de usuário ou empresa para escrever uma avaliação
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou empresa..."
                className="pl-10"
                value={profileSearchQuery}
                onChange={(e) => setProfileSearchQuery(e.target.value)}
              />
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {availableProfiles
                  .filter(p => {
                    const query = profileSearchQuery.toLowerCase();
                    if (!query) return true;
                    return (
                      (p.full_name?.toLowerCase().includes(query)) ||
                      (p.company_name?.toLowerCase().includes(query)) ||
                      (p.username?.toLowerCase().includes(query))
                    );
                  })
                  .map((profileItem) => (
                    <Link
                      key={profileItem.id}
                      to={profileItem.type === 'business' 
                        ? `/${profileItem.slug}/avaliar` 
                        : `/${profileItem.username}/avaliar`}
                      onClick={() => setShowEvaluateDialog(false)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors border"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={profileItem.avatar_url || ''} />
                        <AvatarFallback className="bg-slate-200 text-slate-600">
                          {profileItem.type === 'business' ? (
                            <Building2 className="w-6 h-6" />
                          ) : (
                            <User className="w-6 h-6" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {profileItem.type === 'business' 
                            ? profileItem.company_name 
                            : (profileItem.full_name || profileItem.username)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {profileItem.type === 'business' ? 'Empresa' : 'Usuário'} • @{profileItem.username}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost">
                        Avaliar
                      </Button>
                    </Link>
                  ))}
                
                {availableProfiles.filter(p => {
                  const query = profileSearchQuery.toLowerCase();
                  if (!query) return true;
                  return (
                    (p.full_name?.toLowerCase().includes(query)) ||
                    (p.company_name?.toLowerCase().includes(query)) ||
                    (p.username?.toLowerCase().includes(query))
                  );
                }).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum perfil encontrado
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Story Dialog */}
      {profile && (
        <CreateStoryDialog
          isOpen={showCreateStoryDialog}
          onClose={() => setShowCreateStoryDialog(false)}
          profiles={[
            {
              id: profile.id,
              username: profile.username,
              full_name: profile.full_name || '',
              profile_type: 'user',
              avatar_url: profile.avatar_url,
            },
            ...businessProfiles.map(bp => ({
              id: bp.id,
              username: bp.slug || '',
              full_name: bp.company_name,
              profile_type: 'business' as const,
              avatar_url: bp.logo_url,
            }))
          ]}
          onStoryCreated={() => {
            setStoriesRefreshTrigger(prev => prev + 1);
            toast({
              title: 'Story publicado! ✨',
              description: 'Seu story foi publicado com sucesso',
            });
          }}
        />
      )}

      <SearchSlideIn 
        isOpen={showSearchSlideIn} 
        onClose={() => setShowSearchSlideIn(false)}
      />

      <Footer />
    </div>
  );
}