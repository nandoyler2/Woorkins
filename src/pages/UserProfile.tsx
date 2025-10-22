import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Calendar, User as UserIcon, Star, Briefcase, MessageSquare, ThumbsUp, AlertCircle } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { PublicWhatsAppWidget } from '@/components/generic/PublicWhatsAppWidget';
import { PublicTestimonialsSlider } from '@/components/generic/PublicTestimonialsSlider';
import { SafeImage } from '@/components/ui/safe-image';
import { PublicUserBanners } from '@/components/user/PublicUserBanners';
import { PublicUserAppointments } from '@/components/user/PublicUserAppointments';
import { PublicUserNegotiation } from '@/components/user/PublicUserNegotiation';
import { PublicUserPortfolio } from '@/components/user/PublicUserPortfolio';
import { PublicUserCatalog } from '@/components/user/PublicUserCatalog';
import { PublicUserJobVacancies } from '@/components/user/PublicUserJobVacancies';
import { PublicUserCertifications } from '@/components/user/PublicUserCertifications';
import { PublicUserVideo } from '@/components/user/PublicUserVideo';
import { PublicUserSocial } from '@/components/user/PublicUserSocial';
import { useToast } from '@/hooks/use-toast';
import { formatFullName } from '@/lib/utils';
import { ProfileEvaluationForm } from '@/components/ProfileEvaluationForm';
import { ClickableProfile } from '@/components/ClickableProfile';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthAction } from '@/contexts/AuthActionContext';


interface UserProfileData {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  created_at: string;
  verified: boolean;
  trust_level: string;
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

export default function UserProfile() {
  const { slug, tab } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { requireAuth } = useAuthAction();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [positiveEvaluations, setPositiveEvaluations] = useState<Evaluation[]>([]);
  const [complaintEvaluations, setComplaintEvaluations] = useState<Evaluation[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const activeTab = tab || 'inicio';
  const isProfileOwner = user?.id === profile?.user_id;
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

  useEffect(() => {
    if (profile) {
      document.title = `${formatFullName(profile.full_name)} (@${profile.username}) - Woorkins`;
    } else {
      document.title = 'Perfil - Woorkins';
    }
  }, [profile]);

  useEffect(() => {
    loadUserProfile();
  }, [slug]);

  const loadUserProfile = async () => {
    if (!slug) return;

    try {
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', slug)
        .maybeSingle();

      if (profileError || !profileData) {
        toast({
          title: 'Erro',
          description: 'Usuário não encontrado',
          variant: 'destructive',
        });
        return;
      }

      setProfile(profileData as UserProfileData);

      // Load user's projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('profile_id', profileData.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(6);

      if (projectsData) {
        setProjects(projectsData as UserProject[]);
      }

      // Load user's posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', profileData.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (postsData) {
        setPosts(postsData as UserPost[]);
      }

      // Load evaluations
      await loadEvaluations(profileData.id);

      // Check for content
      await checkContent(profileData.id);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkContent = async (profileId: string) => {
    try {
      // Check testimonials
      const { data: testimonials } = await supabase
        .from('user_testimonials')
        .select('id')
        .eq('profile_id', profileId)
        .limit(1);
      setHasTestimonials((testimonials?.length || 0) > 0);

      // Check video
      const { data: video } = await supabase
        .from('user_videos')
        .select('id')
        .eq('profile_id', profileId)
        .eq('active', true)
        .maybeSingle();
      setHasVideo(!!video);

      // Check portfolio
      const { data: portfolio } = await supabase
        .from('user_portfolio_items')
        .select('id')
        .eq('profile_id', profileId)
        .eq('active', true)
        .limit(1);
      setHasPortfolio((portfolio?.length || 0) > 0);

      // Check catalog
      const { data: catalog } = await supabase
        .from('user_catalog_items')
        .select('id')
        .eq('profile_id', profileId)
        .eq('active', true)
        .limit(1);
      setHasCatalog((catalog?.length || 0) > 0);

      // Check job vacancies
      const { data: vacancies } = await supabase
        .from('user_job_vacancies')
        .select('id')
        .eq('profile_id', profileId)
        .eq('status', 'open')
        .limit(1);
      setHasJobVacancies((vacancies?.length || 0) > 0);
    } catch (error) {
      console.error('Error checking content:', error);
    }
  };

  const loadEvaluations = async (profileId: string) => {
    try {
      const { data: evaluationsData } = await supabase
        .from('evaluations')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            username
          )
        `)
        .eq('business_id', profileId)
        .order('created_at', { ascending: false });

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

  if (loading) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Header />

      {/* Cover - gradiente simples */}
      <div className="w-full h-48 md:h-60 relative overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20" />

      {/* Main Content Container */}
      <div className="container mx-auto px-4 -mt-16 relative z-10 max-w-woorkins">
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Profile Header Card */}
              <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Avatar */}
                    <div className="-mt-20 flex flex-col items-center gap-3">
                      {profile.avatar_url ? (
                        <SafeImage
                          src={profile.avatar_url}
                          alt={formatFullName(profile.full_name)}
                          className="w-36 h-36 rounded-full object-cover bg-card border-4 border-background shadow-lg"
                        />
                      ) : (
                        <div className="w-36 h-36 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 flex items-center justify-center border-4 border-background shadow-lg">
                          <UserIcon className="w-16 h-16 text-primary/70" />
                        </div>
                      )}
                      <Button variant="outline" size="sm" className="rounded-full w-32">
                        Seguir
                      </Button>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h1 className="text-3xl font-bold">{formatFullName(profile.full_name)}</h1>
                          {profile.verified && (
                            <Badge variant="default" className="text-xs">
                              ✓ Verificado
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-2">@{profile.username}</p>
                        {profile.bio && (
                          <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
                        )}
                      </div>

                      {/* ELEMENTOS EXCLUSIVOS DO USUÁRIO - Badge de membro e nível */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {profile.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{profile.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Membro desde {new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</span>
                        </div>
                        <Badge variant="outline" className={`${trustLevel.color} text-white border-0`}>
                          {trustLevel.label}
                        </Badge>
                      </div>

                      <PublicUserNegotiation 
                        userId={profile.id}
                        username={profile.username}
                        inline={true}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs Navigation */}
              <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-lg">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 flex flex-nowrap overflow-x-auto scrollbar-hide">
                    <TabsTrigger 
                      value="inicio" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm whitespace-nowrap flex-shrink-0"
                    >
                      Início
                    </TabsTrigger>
                    {hasTestimonials && (
                      <TabsTrigger 
                        value="depoimentos"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm whitespace-nowrap flex-shrink-0"
                      >
                        Depoimentos
                      </TabsTrigger>
                    )}
                    {hasPortfolio && (
                      <TabsTrigger 
                        value="portfolio"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm whitespace-nowrap flex-shrink-0"
                      >
                        Portfólio
                      </TabsTrigger>
                    )}
                    {hasCatalog && (
                      <TabsTrigger 
                        value="servicos"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm whitespace-nowrap flex-shrink-0"
                      >
                        Serviços
                      </TabsTrigger>
                    )}
                    {hasJobVacancies && (
                      <TabsTrigger 
                        value="vagas"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm whitespace-nowrap flex-shrink-0"
                      >
                        Vagas
                      </TabsTrigger>
                    )}
                    <TabsTrigger 
                      value="positivas"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm whitespace-nowrap flex-shrink-0 flex items-center gap-1.5"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Avaliações ({positiveEvaluations.length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="reclamacoes"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm whitespace-nowrap flex-shrink-0 flex items-center gap-1.5"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Reclamações ({complaintEvaluations.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Início Tab */}
                  <TabsContent value="inicio" className="p-6 space-y-6">
                    {/* Banner Section */}
                    <PublicUserBanners userId={profile.id} />

                    {/* Job Vacancies Section */}
                    {hasJobVacancies && <PublicUserJobVacancies userId={profile.id} />}

                    {/* Portfolio Section */}
                    <PublicUserPortfolio userId={profile.id} />

                    {/* Video Section */}
                    <PublicUserVideo userId={profile.id} />

                    {/* Catalog Section */}
                    <PublicUserCatalog userId={profile.id} />

                    {/* Depoimentos Section */}
                    <PublicTestimonialsSlider entityType="user" entityId={profile.id} />

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
                      <PublicUserPortfolio userId={profile.id} />
                    </TabsContent>
                  )}

                  {/* Serviços Tab */}
                  {hasCatalog && (
                    <TabsContent value="servicos" className="p-6">
                      <PublicUserCatalog userId={profile.id} />
                    </TabsContent>
                  )}

                  {/* Vagas Tab */}
                  {hasJobVacancies && (
                    <TabsContent value="vagas" className="p-6">
                      <PublicUserJobVacancies userId={profile.id} />
                    </TabsContent>
                  )}

                  {/* Avaliações Positivas Tab */}
                  <TabsContent value="positivas" className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-bold flex items-center gap-2">
                            <ThumbsUp className="w-5 h-5" />
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
                              <Card key={evaluation.id}>
                                <CardContent className="p-4">
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
                            <AlertCircle className="w-5 h-5" />
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
                              <Card key={evaluation.id}>
                                <CardContent className="p-4">
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
            <div className="space-y-4">
              {/* Rating Highlight Card */}
              <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20 shadow-glow">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Star className="w-8 h-8 text-primary fill-primary" />
                      <span className="text-5xl font-bold text-primary">
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
                        Avaliar {profile.full_name ? profile.full_name.split(' ')[0] : profile.username}
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
                          <div key={evaluation.id} className="bg-background/60 rounded-lg p-3 border border-border/30">
                            <div className="flex items-start gap-2 mb-2">
                              {evaluation.profiles?.avatar_url ? (
                                <SafeImage
                                  src={evaluation.profiles.avatar_url}
                                  alt={evaluation.profiles.full_name}
                                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                  <UserIcon className="w-4 h-4 text-primary" />
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
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        Últimas Reclamações
                      </h3>
                      <div className="space-y-3">
                        {complaintEvaluations.slice(0, 5).map((evaluation) => (
                          <div key={evaluation.id} className="bg-background/60 rounded-lg p-3 border border-border/30">
                            <div className="flex items-start gap-2 mb-2">
                              {evaluation.profiles?.avatar_url ? (
                                <SafeImage
                                  src={evaluation.profiles.avatar_url}
                                  alt={evaluation.profiles.full_name}
                                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                  <UserIcon className="w-4 h-4 text-primary" />
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
              <PublicUserAppointments userId={profile.id} username={profile.username} />

              {/* Negotiation */}
              <PublicUserNegotiation userId={profile.id} username={profile.username} />

              {/* Certifications */}
              <PublicUserCertifications userId={profile.id} />

              {/* Social Links */}
              <PublicUserSocial userId={profile.id} />
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

      {/* WhatsApp Widget */}
      {profile && (
        <PublicWhatsAppWidget 
          entityType="user" 
          entityId={profile.id} 
          entityName={profile.full_name || profile.username} 
        />
      )}
    </div>
  );
}
