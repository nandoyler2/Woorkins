import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MapPin, Calendar, User as UserIcon, Star, Briefcase, MessageSquare, ThumbsUp, AlertCircle } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { PublicWhatsAppWidget } from '@/components/generic/PublicWhatsAppWidget';
import { PublicTestimonialsSlider } from '@/components/generic/PublicTestimonialsSlider';
import { SafeImage } from '@/components/ui/safe-image';
import { PublicBanners } from '@/components/unified/PublicBanners';
import { PublicAppointments } from '@/components/unified/PublicAppointments';
import { PublicNegotiation } from '@/components/unified/PublicNegotiation';
import { PublicPortfolio } from '@/components/unified/PublicPortfolio';
import { PublicCatalog } from '@/components/unified/PublicCatalog';
import { PublicJobVacancies } from '@/components/unified/PublicJobVacancies';
import { PublicCertifications } from '@/components/unified/PublicCertifications';
import { PublicVideo } from '@/components/unified/PublicVideo';
import { PublicSocial } from '@/components/unified/PublicSocial';
import { NegotiationChat } from '@/components/NegotiationChat';
import { useToast } from '@/hooks/use-toast';
import { formatFullName } from '@/lib/utils';
import { ProfileEvaluationForm } from '@/components/ProfileEvaluationForm';
import { ClickableProfile } from '@/components/ClickableProfile';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthAction } from '@/contexts/AuthActionContext';
import { InlinePhotoUpload } from '@/components/InlinePhotoUpload';
import { ImageViewerDialog } from '@/components/ImageViewerDialog';
import { FollowSuccessDialog } from '@/components/FollowSuccessDialog';
import { useFollow } from '@/hooks/useFollow';
import { useImageLuminance } from '@/hooks/useImageLuminance';
import { StoriesViewer } from '@/components/stories/StoriesViewer';
import defaultCover from '@/assets/default-cover.jpg';


interface UserProfileData {
  id: string;
  user_id?: string;
  profile_id?: string;
  username: string;
  slug?: string;
  full_name: string;
  company_name?: string;
  avatar_url: string | null;
  logo_url?: string | null;
  cover_url: string | null;
  cover_position: number | null;
  bio: string | null;
  description?: string | null;
  location: string | null;
  address?: string | null;
  website: string | null;
  website_url?: string | null;
  created_at: string;
  verified: boolean;
  trust_level: string;
  enable_negotiation?: boolean;
}

interface UserProject {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  category: string | null;
  status: string;
  created_at: string;
  proposals_count: number;
}

interface UserPost {
  id: string;
  content: string;
  media_urls: string[] | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

interface Evaluation {
  id: string;
  rating: number;
  title: string;
  content: string;
  created_at: string;
  media_urls: string[] | null;
  media_types: string[] | null;
  evaluation_category: 'positive' | 'complaint';
  user_id: string;
  owner_response: string | null;
  owner_response_at: string | null;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
    username: string;
  };
}

interface UserProfileProps {
  profileType?: 'user' | 'business';
  profileId?: string;
}

export default function UserProfile({ profileType: propProfileType, profileId: propProfileId }: UserProfileProps = {}) {
  const { slug, tab } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { requireAuth } = useAuthAction();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [profileType, setProfileType] = useState<'user' | 'business'>(propProfileType || 'user');
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [positiveEvaluations, setPositiveEvaluations] = useState<Evaluation[]>([]);
  const [complaintEvaluations, setComplaintEvaluations] = useState<Evaluation[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const activeTab = tab || 'inicio';
  const isProfileOwner = user?.id === (profile?.user_id || (profile as any)?.profile_id);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [showAllPositive, setShowAllPositive] = useState(false);
  const [showAllComplaints, setShowAllComplaints] = useState(false);
  const [hasTestimonials, setHasTestimonials] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [hasCatalog, setHasCatalog] = useState(false);
  const [hasJobVacancies, setHasJobVacancies] = useState(false);
  const [responseText, setResponseText] = useState<{ [key: string]: string }>({});
  const [submittingResponse, setSubmittingResponse] = useState<{ [key: string]: boolean }>({});
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showFollowSuccess, setShowFollowSuccess] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  const { isFollowing, loading: followLoading, toggleFollow } = useFollow(profile?.id || '');
  const isCoverDark = useImageLuminance(profile?.cover_url || defaultCover);
  const [hasActiveStories, setHasActiveStories] = useState(false);
  const [showStoriesViewer, setShowStoriesViewer] = useState(false);
  
  const handleTabChange = (value: string) => {
    const basePath = `/${slug}`;
    if (value === 'inicio') {
      navigate(basePath);
    } else {
      navigate(`${basePath}/${value}`);
    }
  };

  const handleEvaluateClick = () => {
    if (requireAuth(() => setShowEvaluationForm(true))) {
      setShowEvaluationForm(true);
    }
  };

  const handleFollowClick = async () => {
    console.log('handleFollowClick - isFollowing:', isFollowing);
    // Se já está seguindo, pede confirmação
    if (isFollowing) {
      console.log('Mostrando confirmação de unfollow');
      setShowUnfollowConfirm(true);
      return;
    }

    console.log('Seguindo perfil');
    // Se não está seguindo, segue diretamente
    if (requireAuth(async () => {
      const result = await toggleFollow();
      if (result === true) {
        setShowFollowSuccess(true);
      }
    })) {
      const result = await toggleFollow();
      if (result === true) {
        setShowFollowSuccess(true);
      }
    }
  };

  const handleUnfollowConfirm = async () => {
    const result = await toggleFollow();
    setShowUnfollowConfirm(false);
    if (result === false) {
      toast({
        title: 'Deixou de seguir',
        description: `Você não segue mais ${profile?.full_name || profile?.company_name}`,
      });
    }
  };

  useEffect(() => {
    if (profile) {
      const displayName = profileType === 'business' ? profile.company_name : formatFullName(profile.full_name);
      const identifier = profile.username || profile.slug;
      document.title = `${displayName} (@${identifier}) - Woorkins`;
    } else {
      document.title = 'Perfil - Woorkins';
    }
  }, [profile, profileType]);

  useEffect(() => {
    // Se recebeu props, usa elas; senão carrega pelo slug
    if (propProfileType && propProfileId) {
      setProfileType(propProfileType);
      loadProfileById(propProfileId, propProfileType);
    } else {
      loadUserProfile();
    }
  }, [slug, propProfileType, propProfileId]);

  useEffect(() => {
    if (profile?.id) {
      checkActiveStories();

      // Subscribe to stories changes
      const channel = supabase
        .channel(`profile-stories-${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profile_stories',
            filter: `profile_id=eq.${profile.id}`,
          },
          () => {
            checkActiveStories();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id]);

  const checkActiveStories = async () => {
    if (!profile?.id) return;
    
    console.log('[UserProfile] Checking stories for profile:', profile.id);
    
    try {
      const { data, error } = await supabase
        .from('profile_stories')
        .select('id, created_at')
        .eq('profile_id', profile.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('[UserProfile] Stories query result:', data, 'error:', error);
      setHasActiveStories((data && data.length > 0) ? true : false);
    } catch (error) {
      console.error('Error checking stories:', error);
    }
  };


  const loadProfileById = async (id: string, type: 'user' | 'business') => {
    try {
      if (type === 'user') {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error || !profileData) {
          toast({ title: 'Erro', description: 'Usuário não encontrado', variant: 'destructive' });
          setLoadingProfile(false);
          return;
        }

        // Add cache-busting timestamp to image URLs
        const profileWithFreshImages = {
          ...profileData,
          avatar_url: profileData.avatar_url ? `${profileData.avatar_url}?t=${Date.now()}` : null,
          cover_url: profileData.cover_url ? `${profileData.cover_url}?t=${Date.now()}` : null,
        };
        setProfile(profileWithFreshImages as UserProfileData);
        setLoadingProfile(false);

        // Load additional content in background
        Promise.all([
          loadProjects(profileData.id, 'user'),
          loadPosts(profileData.id, 'user'),
          loadEvaluations(profileData.id),
          checkContent(profileData.id, 'user')
        ]).catch(console.error);
      } else {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .eq('profile_type', 'business')
          .maybeSingle();

        if (error || !profileData) {
          toast({ title: 'Erro', description: 'Perfil não encontrado', variant: 'destructive' });
          setLoadingProfile(false);
          return;
        }

        // Add cache-busting timestamp to image URLs
        const profileWithFreshImages = {
          ...profileData,
          avatar_url: profileData.avatar_url ? `${profileData.avatar_url}?t=${Date.now()}` : null,
          logo_url: profileData.logo_url ? `${profileData.logo_url}?t=${Date.now()}` : null,
          cover_url: profileData.cover_url ? `${profileData.cover_url}?t=${Date.now()}` : null,
        };
        setProfile(profileWithFreshImages as unknown as UserProfileData);
        setLoadingProfile(false);

        // Load additional content in background
        Promise.all([
          loadPosts(profileData.id, 'business'),
          loadEvaluations(profileData.id),
          checkContent(profileData.id, 'business')
        ]).catch(console.error);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoadingProfile(false);
    }
  };

  const loadUserProfile = async () => {
    if (!slug) return;

    try {
      // 1) Tenta como perfil profissional (business) pelo slug primeiro
      const { data: businessData } = await supabase
        .from('profiles')
        .select('*')
        .eq('slug', slug)
        .eq('profile_type', 'business')
        .maybeSingle();

      if (businessData) {
        setProfileType('business');
        // Add cache-busting timestamp to image URLs
        const profileWithFreshImages = {
          ...businessData,
          avatar_url: businessData.avatar_url ? `${businessData.avatar_url}?t=${Date.now()}` : null,
          logo_url: businessData.logo_url ? `${businessData.logo_url}?t=${Date.now()}` : null,
          cover_url: businessData.cover_url ? `${businessData.cover_url}?t=${Date.now()}` : null,
        };
        setProfile(profileWithFreshImages as unknown as UserProfileData);
        setLoadingProfile(false);

        // Load additional content in background
        Promise.all([
          loadPosts(businessData.id, 'business'),
          loadEvaluations(businessData.id),
          checkContent(businessData.id, 'business')
        ]).catch(console.error);
        return;
      }

      // 2) Se não encontrou, tenta carregar como usuário (username)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', slug)
        .maybeSingle();

      if (profileData) {
        setProfileType('user');
        // Add cache-busting timestamp to image URLs
        const profileWithFreshImages = {
          ...profileData,
          avatar_url: profileData.avatar_url ? `${profileData.avatar_url}?t=${Date.now()}` : null,
          cover_url: profileData.cover_url ? `${profileData.cover_url}?t=${Date.now()}` : null,
        };
        setProfile(profileWithFreshImages as UserProfileData);
        setLoadingProfile(false);

        // Load additional content in background
        Promise.all([
          loadProjects(profileData.id, 'user'),
          loadPosts(profileData.id, 'user'),
          loadEvaluations(profileData.id),
          checkContent(profileData.id, 'user')
        ]).catch(console.error);
      } else {
        toast({ title: 'Erro', description: 'Perfil não encontrado', variant: 'destructive' });
        setLoadingProfile(false);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setLoadingProfile(false);
    }
  };

  const loadProjects = async (profileId: string, type: 'user' | 'business') => {
    if (type === 'business') return; // Perfis profissionais não têm projetos

    const { data: projectsData } = await supabase
      .from('projects')
      .select('*')
      .eq('profile_id', profileId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(6);

    if (projectsData) {
      setProjects(projectsData as UserProject[]);
    }
  };

  const loadPosts = async (profileId: string, type: 'user' | 'business') => {
    const tableName = type === 'user' ? 'user_posts' : 'business_posts';
    const idColumn = type === 'user' ? 'profile_id' : 'business_id';

    const { data: postsData } = await supabase
      .from(tableName as any)
      .select('*')
      .eq(idColumn, profileId)
      .order('created_at', { ascending: false })
      .limit(6);

    if (postsData) {
      setPosts(postsData as unknown as UserPost[]);
    }
  };

  const checkContent = async (profileId: string, type: 'user' | 'business') => {
    const prefix = type === 'user' ? 'user' : 'business';
    const idColumn = type === 'user' ? 'profile_id' : 'business_id';

    try {
      // Check all content in parallel
      const [testimonials, video, portfolio, catalog, vacancies] = await Promise.all([
        supabase
          .from(`${prefix}_testimonials` as any)
          .select('id', { count: 'exact', head: true })
          .eq(idColumn, profileId),
        supabase
          .from(`${prefix}_videos` as any)
          .select('id')
          .eq(idColumn, profileId)
          .eq('active', true)
          .maybeSingle(),
        supabase
          .from(`${prefix}_portfolio_items` as any)
          .select('id', { count: 'exact', head: true })
          .eq(idColumn, profileId)
          .eq('active', true),
        supabase
          .from(`${prefix}_catalog_items` as any)
          .select('id', { count: 'exact', head: true })
          .eq(idColumn, profileId)
          .eq('active', true),
        supabase
          .from(`${prefix}_job_vacancies` as any)
          .select('id', { count: 'exact', head: true })
          .eq(idColumn, profileId)
          .eq('status', 'open')
      ]);

      setHasTestimonials((testimonials.count || 0) > 0);
      setHasVideo(!!video.data);
      setHasPortfolio((portfolio.count || 0) > 0);
      setHasCatalog((catalog.count || 0) > 0);
      setHasJobVacancies((vacancies.count || 0) > 0);
    } catch (error) {
      console.error('Error checking content:', error);
    }
  };

  const loadEvaluations = async (profileId: string) => {
    try {
      const { data: evaluationsData } = await supabase
      .from('evaluations')
      .select('*,author_profile:profiles!evaluations_author_profile_id_fkey(id,name,avatar_url,logo_url)')
      .eq('target_profile_id', profileId)
        .order('created_at', { ascending: false});

      if (evaluationsData) {
        const evals = evaluationsData as unknown as Evaluation[];
        setEvaluations(evals);
        
        // Separar por categoria
        setPositiveEvaluations(evals.filter(e => e.evaluation_category === 'positive'));
        setComplaintEvaluations(evals.filter(e => e.evaluation_category === 'complaint'));
        
        // Calcular média
        const avg = evals.length > 0 
          ? evals.reduce((acc, curr) => acc + curr.rating, 0) / evals.length 
          : 0;
        setAverageRating(avg);
      }
    } catch (error) {
      console.error('Error loading evaluations:', error);
    }
  };

  const getTrustLevelInfo = (level: string) => {
    const levels: Record<string, { color: string; label: string }> = {
      bronze: { color: 'bg-amber-700', label: 'Bronze' },
      silver: { color: 'bg-gray-400', label: 'Prata' },
      gold: { color: 'bg-yellow-500', label: 'Ouro' },
      platinum: { color: 'bg-blue-400', label: 'Platina' },
    };
    return levels[level] || levels.bronze;
  };


  const handleSubmitResponse = async (evaluationId: string) => {
    const response = responseText[evaluationId];
    if (!response || !response.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma resposta",
        variant: "destructive",
      });
      return;
    }

    setSubmittingResponse(prev => ({ ...prev, [evaluationId]: true }));

    try {
      const { error } = await supabase
        .from('evaluations')
        .update({
          owner_response: response,
          owner_response_at: new Date().toISOString(),
        })
        .eq('id', evaluationId);

      if (error) throw error;

      toast({
        title: "Resposta enviada!",
        description: "Sua resposta foi publicada com sucesso",
      });

      // Atualizar a lista de avaliações
      if (profile) {
        loadEvaluations(profile.id);
      }
      setResponseText(prev => {
        const newState = { ...prev };
        delete newState[evaluationId];
        return newState;
      });
    } catch (error) {
      console.error('Error submitting response:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a resposta",
        variant: "destructive",
      });
    } finally {
      setSubmittingResponse(prev => ({ ...prev, [evaluationId]: false }));
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center max-w-woorkins">
          <h1 className="text-4xl font-bold mb-4">Usuário não encontrado</h1>
          <p className="text-muted-foreground">Este perfil não existe ou foi removido.</p>
        </div>
      </div>
    );
  }

  const trustLevel = getTrustLevelInfo(profile.trust_level || 'bronze');
  
  // Select the correct photo field based on profile type
  const mainPhotoUrl = profileType === 'business' ? profile.logo_url : profile.avatar_url;
  const mainPhotoAlt = profileType === 'business' 
    ? (profile.company_name || profile.username)
    : formatFullName(profile.full_name);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Header />

      {/* Cover - gradiente simples */}
      {isProfileOwner ? (
        <div className="w-full h-48 md:h-60 relative">
        <InlinePhotoUpload
            currentPhotoUrl={profile.cover_url || undefined}
            userId={user!.id}
            userName={profile.full_name || profile.username}
            onPhotoUpdated={loadUserProfile}
            type="cover"
            className="w-full h-full"
            iconPosition="top"
            currentCoverPosition={profile.cover_position || 50}
            entityType={profileType}
            profileId={profile.id}
          >
            <div className="w-full h-full relative overflow-hidden">
              <div 
                className="w-full h-full"
                style={{ 
                  backgroundImage: `url(${profile.cover_url || defaultCover})`,
                  backgroundSize: 'cover',
                  backgroundPosition: `center ${profile.cover_position || 50}%`
                }}
              />
            </div>
          </InlinePhotoUpload>
        </div>
      ) : (
        <div className="w-full h-48 md:h-60 relative overflow-hidden">
          <div 
            className="w-full h-full"
            style={{ 
              backgroundImage: `url(${profile.cover_url || defaultCover})`,
              backgroundSize: 'cover',
              backgroundPosition: `center ${profile.cover_position || 50}%`
            }}
          />
        </div>
      )}

      {/* Main Content Container */}
      <div className="container mx-auto px-4 -mt-16 relative z-10 max-w-woorkins">
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Profile Header Card */}
              <Card className="bg-card/30 backdrop-blur-sm border-2 border-primary/10 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Avatar */}
                    <div className="-mt-20 flex flex-col items-center gap-3">
                      {isProfileOwner ? (
                        <div className={hasActiveStories ? "relative p-1 rounded-full animate-[story-ring-fill_1.5s_ease-out_forwards]" : ""}>
                          <InlinePhotoUpload
                            currentPhotoUrl={mainPhotoUrl || undefined}
                            userId={user!.id}
                            userName={profileType === 'business' 
                              ? (profile.company_name || profile.username)
                              : (profile.full_name || profile.username)
                            }
                            onPhotoUpdated={loadUserProfile}
                            type="avatar"
                            className="w-36 h-36 rounded-full"
                            entityType={profileType}
                            profileId={profile.id}
                          >
                            <div 
                              className="cursor-pointer"
                              onClick={() => {
                                if (hasActiveStories) {
                                  setShowStoriesViewer(true);
                                } else if (mainPhotoUrl) {
                                  setShowImageViewer(true);
                                }
                              }}
                            >
                               {mainPhotoUrl ? (
                                <SafeImage
                                  key={mainPhotoUrl}
                                  src={mainPhotoUrl}
                                  alt={mainPhotoAlt}
                                  className="w-36 h-36 rounded-full object-cover bg-card border-4 border-background shadow-lg"
                                />
                              ) : (
                                <div className="w-36 h-36 rounded-full bg-card border-4 border-background shadow-lg flex items-center justify-center">
                                  <UserIcon className="w-16 h-16 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </InlinePhotoUpload>
                        </div>
                      ) : (
                        <div 
                          className={hasActiveStories ? "relative p-1 rounded-full animate-[story-ring-fill_1.5s_ease-out_forwards]" : ""}
                          onClick={() => {
                            console.log('[UserProfile] Avatar clicked. hasActiveStories:', hasActiveStories, 'profile.id:', profile?.id);
                            setShowStoriesViewer(true);
                          }}
                        >
                          <div className="relative cursor-pointer">
                            {mainPhotoUrl ? (
                              <SafeImage
                                key={mainPhotoUrl}
                                src={mainPhotoUrl}
                                alt={mainPhotoAlt}
                                className="w-36 h-36 rounded-full object-cover bg-card shadow-lg border-4 border-background"
                              />
                            ) : (
                              <div className="w-36 h-36 rounded-full bg-card border-4 border-background shadow-lg flex items-center justify-center">
                                <UserIcon className="w-16 h-16 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {!isProfileOwner && (
                        <Button
                          variant={isFollowing ? 'secondary' : 'outline'}
                          size="sm"
                          className="rounded-full w-32"
                          onClick={handleFollowClick}
                          disabled={followLoading}
                        >
                          {isFollowing ? 'Seguindo' : 'Seguir'}
                        </Button>
                      )}
                    </div>

                    {/* User/Business Info */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h1 className={`text-3xl font-bold ${isCoverDark ? 'text-white' : 'text-black'}`}>
                            {profileType === 'business' 
                              ? (profile.company_name || formatFullName(profile.full_name))
                              : formatFullName(profile.full_name)
                            }
                          </h1>
                          {profile.verified && (
                            <Badge variant="default" className="text-xs">
                              ✓ Verificado
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-2">
                          @{profile.username || profile.slug}
                        </p>
                        {profile.bio && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {profile.bio}
                          </p>
                        )}
                      </div>

                      {/* Informações unificadas */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {profile.location && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-full border border-blue-500/20">
                            <MapPin className="w-4 h-4 text-blue-500" />
                            <span className="text-foreground">{profile.location}</span>
                          </div>
                        )}
                        <PublicNegotiation 
                          entityType={profileType}
                          entityId={profile.id}
                          username={profile.username}
                          inline={true}
                        />
                        {profileType === 'user' && (
                          <Badge variant="outline" className={`${trustLevel.color} text-white border-0 shadow-md`}>
                            {trustLevel.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs Navigation */}
              <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md border-2 border-primary/10 shadow-xl">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 flex flex-nowrap overflow-x-auto scrollbar-hide">
                    <TabsTrigger 
                      value="inicio" 
                      className="rounded-none border-b-3 border-transparent data-[state=active]:border-primary data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-transparent px-5 py-4 text-sm whitespace-nowrap flex-shrink-0 transition-all duration-200 hover:bg-primary/5"
                    >
                      <Briefcase className="w-4 h-4 mr-2 text-orange-500" />
                      Início
                    </TabsTrigger>
                    {hasTestimonials && (
                      <TabsTrigger 
                        value="depoimentos"
                        className="rounded-none border-b-3 border-transparent data-[state=active]:border-primary data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-transparent px-5 py-4 text-sm whitespace-nowrap flex-shrink-0 transition-all duration-200 hover:bg-primary/5"
                      >
                        <MessageSquare className="w-4 h-4 mr-2 text-teal-500" />
                        Depoimentos
                      </TabsTrigger>
                    )}
                    {hasPortfolio && (
                      <TabsTrigger 
                        value="portfolio"
                        className="rounded-none border-b-3 border-transparent data-[state=active]:border-primary data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-transparent px-5 py-4 text-sm whitespace-nowrap flex-shrink-0 transition-all duration-200 hover:bg-primary/5"
                      >
                        <Briefcase className="w-4 h-4 mr-2 text-purple-500" />
                        Portfólio
                      </TabsTrigger>
                    )}
                    {hasCatalog && (
                      <TabsTrigger 
                        value="servicos"
                        className="rounded-none border-b-3 border-transparent data-[state=active]:border-primary data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-transparent px-5 py-4 text-sm whitespace-nowrap flex-shrink-0 transition-all duration-200 hover:bg-primary/5"
                      >
                        <Star className="w-4 h-4 mr-2 text-yellow-500" />
                        Serviços
                      </TabsTrigger>
                    )}
                    {hasJobVacancies && (
                      <TabsTrigger 
                        value="vagas"
                        className="rounded-none border-b-3 border-transparent data-[state=active]:border-primary data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/10 data-[state=active]:to-transparent px-5 py-4 text-sm whitespace-nowrap flex-shrink-0 transition-all duration-200 hover:bg-primary/5"
                      >
                        <Briefcase className="w-4 h-4 mr-2 text-green-500" />
                        Vagas
                      </TabsTrigger>
                    )}
                    <TabsTrigger 
                      value="positivas"
                      className="rounded-none border-b-3 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-gradient-to-b data-[state=active]:from-green-500/10 data-[state=active]:to-transparent px-5 py-4 text-sm whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 transition-all duration-200 hover:bg-green-500/5"
                    >
                      <ThumbsUp className="w-4 h-4 text-green-500" />
                      Avaliações ({positiveEvaluations.length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="reclamacoes"
                      className="rounded-none border-b-3 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-gradient-to-b data-[state=active]:from-red-500/10 data-[state=active]:to-transparent px-5 py-4 text-sm whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 transition-all duration-200 hover:bg-red-500/5"
                    >
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      Reclamações ({complaintEvaluations.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Início Tab */}
                  <TabsContent value="inicio" className="p-6 space-y-6">
                    {/* Banner Section */}
                    <PublicBanners entityType={profileType} entityId={profile.id} />

                    {/* Job Vacancies Section */}
                    {hasJobVacancies && <PublicJobVacancies entityType={profileType} entityId={profile.id} />}

                    {/* Portfolio Section */}
                    <PublicPortfolio entityType={profileType} entityId={profile.id} />

                    {/* Video Section */}
                    <PublicVideo entityType={profileType} entityId={profile.id} />

                    {/* Catalog Section */}
                    <PublicCatalog entityType={profileType} entityId={profile.id} />

                    {/* Depoimentos Section */}
                    <PublicTestimonialsSlider entityType={profileType} entityId={profile.id} />

                  </TabsContent>

                  {/* Depoimentos Tab */}
                  {hasTestimonials && (
                    <TabsContent value="depoimentos" className="p-6">
                      <PublicTestimonialsSlider entityType="user" entityId={profile.id} />
                    </TabsContent>
                  )}

                  {/* Portfolio Tab */}
                  {hasPortfolio && (
                    <TabsContent value="portfolio" className="p-6">
                      <PublicPortfolio entityType={profileType} entityId={profile.id} />
                    </TabsContent>
                  )}

                  {/* Serviços Tab */}
                  {hasCatalog && (
                    <TabsContent value="servicos" className="p-6">
                      <PublicCatalog entityType={profileType} entityId={profile.id} />
                    </TabsContent>
                  )}

                  {/* Vagas Tab */}
                  {hasJobVacancies && (
                    <TabsContent value="vagas" className="p-6">
                      <PublicJobVacancies entityType={profileType} entityId={profile.id} />
                    </TabsContent>
                  )}

                  {/* Avaliações Positivas Tab */}
                  <TabsContent value="positivas" className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-bold flex items-center gap-2">
                            <ThumbsUp className="w-5 h-5 text-green-500" />
                            Avaliações Positivas
                          </h2>
                          {positiveEvaluations.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {positiveEvaluations.length} {positiveEvaluations.length === 1 ? 'avaliação' : 'avaliações'}
                            </p>
                          )}
                        </div>
                        {!isProfileOwner && (
                          <Button onClick={handleEvaluateClick}>
                            {showEvaluationForm ? 'Cancelar' : 'Avaliar'}
                          </Button>
                        )}
                      </div>

                      {showEvaluationForm && profile && (
                        <Dialog open={showEvaluationForm} onOpenChange={setShowEvaluationForm}>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Avaliar {formatFullName(profile.full_name)}</DialogTitle>
                            </DialogHeader>
                            <ProfileEvaluationForm
                              profileId={profile.id}
                              onSuccess={() => {
                                setShowEvaluationForm(false);
                                loadEvaluations(profile.id);
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                      )}

                      {positiveEvaluations.length === 0 ? (
                        <div className="text-center py-12">
                          <ThumbsUp className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-muted-foreground">Nenhuma avaliação positiva ainda</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-4">
                            {positiveEvaluations.slice(0, showAllPositive ? undefined : 5).map((evaluation) => (
                              <Card key={evaluation.id} className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-500/5 to-transparent hover:shadow-lg hover:scale-[1.01] transition-all duration-300">
                                <CardContent className="p-5">
                                  <div className="flex items-start gap-4">
                                    <ClickableProfile
                                      profileId={evaluation.user_id}
                                      username={evaluation.profiles?.username}
                                      fullName={evaluation.profiles?.full_name}
                                      avatarUrl={evaluation.profiles?.avatar_url}
                                      showName={false}
                                      avatarSize="lg"
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <ClickableProfile
                                            profileId={evaluation.user_id}
                                            username={evaluation.profiles?.username}
                                            fullName={evaluation.profiles?.full_name}
                                            showAvatar={false}
                                            nameClassName="font-semibold"
                                          />
                                          <div className="flex items-center gap-2">
                                            <div className="flex">
                                              {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                  key={star}
                                                  className={`w-4 h-4 ${
                                                    star <= evaluation.rating
                                                      ? 'fill-yellow-400 text-yellow-400'
                                                      : 'text-muted-foreground'
                                                  }`}
                                                />
                                              ))}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(evaluation.created_at).toLocaleDateString('pt-BR')}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-3">
                                        {evaluation.content}
                                      </p>
                                      {evaluation.media_urls && evaluation.media_urls.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2">
                                          {evaluation.media_urls.map((url, idx) => (
                                            <div key={idx} className="aspect-square rounded-lg overflow-hidden">
                                              {evaluation.media_types?.[idx] === 'video' ? (
                                                <video
                                                  src={url}
                                                  controls
                                                  className="w-full h-full object-cover"
                                                />
                                              ) : (
                                                <SafeImage
                                                  src={url}
                                                  alt={`Mídia ${idx + 1}`}
                                                  className="w-full h-full object-cover"
                                                />
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                       )}
                                      
                                      {/* Resposta do dono do perfil */}
                                      {evaluation.owner_response && (
                                        <div className="mt-4 pl-4 border-l-2 border-primary/30 bg-primary/5 p-3 rounded-r">
                                          <p className="text-xs font-semibold text-primary mb-1">
                                            Resposta de {formatFullName(profile.full_name)}:
                                          </p>
                                          <p className="text-sm text-foreground">
                                            {evaluation.owner_response}
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(evaluation.owner_response_at!).toLocaleDateString('pt-BR')}
                                          </p>
                                        </div>
                                      )}

                                      {/* Formulário de resposta para o dono do perfil */}
                                      {isProfileOwner && !evaluation.owner_response && (
                                        <div className="mt-4 space-y-2">
                                          <Textarea
                                            placeholder="Digite sua resposta..."
                                            value={responseText[evaluation.id] || ''}
                                            onChange={(e) => setResponseText(prev => ({
                                              ...prev,
                                              [evaluation.id]: e.target.value
                                            }))}
                                            className="min-h-[80px]"
                                          />
                                          <Button
                                            onClick={() => handleSubmitResponse(evaluation.id)}
                                            disabled={submittingResponse[evaluation.id]}
                                            size="sm"
                                          >
                                            {submittingResponse[evaluation.id] ? 'Enviando...' : 'Enviar Resposta'}
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          {positiveEvaluations.length > 5 && (
                            <Button
                              variant="outline"
                              onClick={() => setShowAllPositive(!showAllPositive)}
                              className="w-full"
                            >
                              {showAllPositive ? 'Ver menos' : `Ver mais (${positiveEvaluations.length - 5} restantes)`}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>

                  {/* Reclamações Tab */}
                  <TabsContent value="reclamacoes" className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-bold flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            Reclamações
                          </h2>
                          {complaintEvaluations.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {complaintEvaluations.length} {complaintEvaluations.length === 1 ? 'reclamação' : 'reclamações'}
                            </p>
                          )}
                        </div>
                        {!isProfileOwner && (
                          <Button onClick={handleEvaluateClick}>
                            {showEvaluationForm ? 'Cancelar' : 'Avaliar'}
                          </Button>
                        )}
                      </div>

                      {showEvaluationForm && profile && (
                        <Dialog open={showEvaluationForm} onOpenChange={setShowEvaluationForm}>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Avaliar {formatFullName(profile.full_name)}</DialogTitle>
                            </DialogHeader>
                            <ProfileEvaluationForm
                              profileId={profile.id}
                              onSuccess={() => {
                                setShowEvaluationForm(false);
                                loadEvaluations(profile.id);
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                      )}

                      {complaintEvaluations.length === 0 ? (
                        <div className="text-center py-12">
                          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-muted-foreground">Nenhuma reclamação ainda</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-4">
                            {complaintEvaluations.slice(0, showAllComplaints ? undefined : 5).map((evaluation) => (
                              <Card key={evaluation.id} className="border-l-4 border-l-red-500 bg-gradient-to-r from-red-500/5 to-transparent hover:shadow-lg hover:scale-[1.01] transition-all duration-300">
                                <CardContent className="p-5">
                                  <div className="flex items-start gap-4">
                                    <ClickableProfile
                                      profileId={evaluation.user_id}
                                      username={evaluation.profiles?.username}
                                      fullName={evaluation.profiles?.full_name}
                                      avatarUrl={evaluation.profiles?.avatar_url}
                                      showName={false}
                                      avatarSize="lg"
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <ClickableProfile
                                            profileId={evaluation.user_id}
                                            username={evaluation.profiles?.username}
                                            fullName={evaluation.profiles?.full_name}
                                            showAvatar={false}
                                            nameClassName="font-semibold"
                                          />
                                          <div className="flex items-center gap-2">
                                            <div className="flex">
                                              {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                  key={star}
                                                  className={`w-4 h-4 ${
                                                    star <= evaluation.rating
                                                      ? 'fill-yellow-400 text-yellow-400'
                                                      : 'text-muted-foreground'
                                                  }`}
                                                />
                                              ))}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(evaluation.created_at).toLocaleDateString('pt-BR')}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-3">
                                        {evaluation.content}
                                      </p>
                                      {evaluation.media_urls && evaluation.media_urls.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2">
                                          {evaluation.media_urls.map((url, idx) => (
                                            <div key={idx} className="aspect-square rounded-lg overflow-hidden">
                                              {evaluation.media_types?.[idx] === 'video' ? (
                                                <video
                                                  src={url}
                                                  controls
                                                  className="w-full h-full object-cover"
                                                />
                                              ) : (
                                                <SafeImage
                                                  src={url}
                                                  alt={`Mídia ${idx + 1}`}
                                                  className="w-full h-full object-cover"
                                                />
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Resposta do dono do perfil */}
                                      {evaluation.owner_response && (
                                        <div className="mt-4 pl-4 border-l-2 border-primary/30 bg-primary/5 p-3 rounded-r">
                                          <p className="text-xs font-semibold text-primary mb-1">
                                            Resposta de {formatFullName(profile.full_name)}:
                                          </p>
                                          <p className="text-sm text-foreground">
                                            {evaluation.owner_response}
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(evaluation.owner_response_at!).toLocaleDateString('pt-BR')}
                                          </p>
                                        </div>
                                      )}

                                      {/* Formulário de resposta para o dono do perfil */}
                                      {isProfileOwner && !evaluation.owner_response && (
                                        <div className="mt-4 space-y-2">
                                          <Textarea
                                            placeholder="Digite sua resposta..."
                                            value={responseText[evaluation.id] || ''}
                                            onChange={(e) => setResponseText(prev => ({
                                              ...prev,
                                              [evaluation.id]: e.target.value
                                            }))}
                                            className="min-h-[80px]"
                                          />
                                          <Button
                                            onClick={() => handleSubmitResponse(evaluation.id)}
                                            disabled={submittingResponse[evaluation.id]}
                                            size="sm"
                                          >
                                            {submittingResponse[evaluation.id] ? 'Enviando...' : 'Enviar Resposta'}
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          {complaintEvaluations.length > 5 && (
                            <Button
                              variant="outline"
                              onClick={() => setShowAllComplaints(!showAllComplaints)}
                              className="w-full"
                            >
                              {showAllComplaints ? 'Ver menos' : `Ver mais (${complaintEvaluations.length - 5} restantes)`}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>

            {/* Right Column - Info Sidebar */}
            <div className="space-y-4 pb-8">
              {/* Rating Highlight Card */}
              <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/10 border-2 border-primary/30 shadow-2xl hover:shadow-primary/20 transition-all duration-300 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div 
                    className="text-center cursor-pointer hover:opacity-80 transition-opacity" 
                    onClick={handleEvaluateClick}
                  >
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <Star className="w-10 h-10 text-yellow-500 fill-yellow-500 drop-shadow-lg" />
                      <span className="text-6xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
                        {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Baseado em <span className="font-semibold text-foreground">{evaluations.length}</span> avaliações
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-3 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.round(averageRating)
                              ? 'text-primary fill-primary'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                    {!isProfileOwner && (
                      <Button 
                        onClick={handleEvaluateClick}
                        className="w-full"
                      >
                        Avaliar {profileType === 'business' 
                          ? (profile.company_name || profile.slug) 
                          : (profile.full_name ? profile.full_name.split(' ')[0] : profile.username)}
                      </Button>
                    )}
                  </div>

                  {/* Últimas Avaliações Positivas */}
                  {positiveEvaluations.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border/50">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4 text-green-500" />
                        Últimas Avaliações
                      </h3>
                      <div className="space-y-3">
                        {positiveEvaluations.slice(0, 5).map((evaluation) => (
                          <div key={evaluation.id} className="bg-gradient-to-r from-green-500/10 to-transparent rounded-lg p-3 border-l-2 border-l-green-500 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer" onClick={() => handleTabChange("positivas")}>
                            <div className="flex items-start gap-2 mb-2">
                              {evaluation.profiles?.avatar_url ? (
                                <SafeImage
                                  src={evaluation.profiles.avatar_url}
                                  alt={evaluation.profiles.full_name}
                                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center flex-shrink-0">
                                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-3 h-3 ${
                                        star <= evaluation.rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-muted-foreground'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {evaluation.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {positiveEvaluations.length > 5 && (
                        <button
                          onClick={() => handleTabChange("positivas")}
                          className="text-sm text-primary hover:underline mt-2 block"
                        >
                          Ver todas as avaliações →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Últimas Reclamações */}
                  {complaintEvaluations.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border/50">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        Últimas Reclamações
                      </h3>
                      <div className="space-y-3">
                        {complaintEvaluations.slice(0, 5).map((evaluation) => (
                          <div key={evaluation.id} className="bg-gradient-to-r from-red-500/10 to-transparent rounded-lg p-3 border-l-2 border-l-red-500 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer" onClick={() => handleTabChange("reclamacoes")}>
                            <div className="flex items-start gap-2 mb-2">
                              {evaluation.profiles?.avatar_url ? (
                                <SafeImage
                                  src={evaluation.profiles.avatar_url}
                                  alt={evaluation.profiles.full_name}
                                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center flex-shrink-0">
                                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-3 h-3 ${
                                        star <= evaluation.rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-muted-foreground'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {evaluation.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {complaintEvaluations.length > 5 && (
                        <button
                          onClick={() => handleTabChange("reclamacoes")}
                          className="text-sm text-primary hover:underline mt-2 block"
                        >
                          Ver todas as reclamações →
                        </button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>


              {/* Appointments */}
              <PublicAppointments entityType={profileType} entityId={profile.id} username={profileType === 'business' ? (profile.slug || '') : profile.username} />

              {/* Certifications */}
              <PublicCertifications entityType={profileType} entityId={profile.id} />

              {/* Social Links */}
              <PublicSocial entityType={profileType} entityId={profile.id} />
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Evaluation Dialog */}
      {profile && (
        <Dialog open={showEvaluationForm} onOpenChange={setShowEvaluationForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Avaliar {formatFullName(profile.full_name)}</DialogTitle>
            </DialogHeader>
            <ProfileEvaluationForm
              profileId={profile.id}
              onSuccess={() => {
                setShowEvaluationForm(false);
                loadEvaluations(profile.id);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Image Viewer Modal */}
      {mainPhotoUrl && (
        <ImageViewerDialog
          imageUrl={mainPhotoUrl}
          alt={mainPhotoAlt}
          open={showImageViewer}
          onClose={() => setShowImageViewer(false)}
        />
      )}

      {/* Follow Success Dialog */}
      {profile && (
        <FollowSuccessDialog
          open={showFollowSuccess}
          onOpenChange={setShowFollowSuccess}
          profileName={profileType === 'business' ? (profile.company_name || profile.username) : formatFullName(profile.full_name)}
          profileAvatar={mainPhotoUrl}
          profileType={profileType}
        />
      )}

      {/* Unfollow Confirmation Dialog */}
      <AlertDialog open={showUnfollowConfirm} onOpenChange={setShowUnfollowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deixar de seguir?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deixar de seguir {profile?.full_name || profile?.company_name}? 
              Você não receberá mais notificações sobre as atualizações deste perfil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnfollowConfirm}>
              Deixar de seguir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stories Viewer */}
      {profile && showStoriesViewer && (
        <>
          {console.log('[UserProfile] Rendering StoriesViewer. profile.id:', profile.id, 'user?.id:', user?.id, 'showStoriesViewer:', showStoriesViewer)}
          <StoriesViewer
            profileId={profile.id}
            isOpen={showStoriesViewer}
            onClose={() => {
              console.log('[UserProfile] Closing stories viewer');
              setShowStoriesViewer(false);
            }}
            currentProfileId={user?.id}
          />
        </>
      )}
    </div>
  );
}
