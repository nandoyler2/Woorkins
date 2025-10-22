import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
import { PublicUserPortfolio } from '@/components/user/PublicUserPortfolio';
import { PublicUserCatalog } from '@/components/user/PublicUserCatalog';
import { PublicUserCertifications } from '@/components/user/PublicUserCertifications';
import { PublicUserVideo } from '@/components/user/PublicUserVideo';
import { PublicUserSocial } from '@/components/user/PublicUserSocial';
import { useToast } from '@/hooks/use-toast';
import { formatFullName } from '@/lib/utils';
import { ProfileEvaluationForm } from '@/components/ProfileEvaluationForm';

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
  profiles?: {
    full_name: string;
    avatar_url: string | null;
    username: string;
  };
}

export default function UserProfile() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [positiveEvaluations, setPositiveEvaluations] = useState<Evaluation[]>([]);
  const [complaintEvaluations, setComplaintEvaluations] = useState<Evaluation[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inicio');
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [showAllPositive, setShowAllPositive] = useState(false);
  const [showAllComplaints, setShowAllComplaints] = useState(false);

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
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
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
                    <div className="-mt-20">
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

                      <Button variant="outline" className="rounded-full">
                        Seguir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs Navigation */}
              <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-lg">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
                    <TabsTrigger 
                      value="inicio" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                    >
                      Início
                    </TabsTrigger>
                    <TabsTrigger 
                      value="sobre"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                    >
                      Sobre
                    </TabsTrigger>
                    <TabsTrigger 
                      value="positivas"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 flex items-center gap-2"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Avaliações Positivas ({positiveEvaluations.length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="reclamacoes"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Reclamações ({complaintEvaluations.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Início Tab */}
                  <TabsContent value="inicio" className="p-6 space-y-6">
                    {/* Banner Section */}
                    <PublicUserBanners userId={profile.id} />

                    {/* Projetos Section */}
                    <div>
                      <h2 className="text-xl font-bold mb-4">Projetos Recentes</h2>
                      {projects.length === 0 ? (
                        <div className="text-center py-8">
                          <Briefcase className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-muted-foreground">Nenhum projeto público ainda</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {projects.slice(0, 3).map((project) => (
                            <Card key={project.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <h3 className="font-semibold text-lg">{project.title}</h3>
                                  <Badge variant="secondary">{project.category}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                  {project.description}
                                </p>
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-4 text-muted-foreground">
                                    {project.budget_min && project.budget_max && (
                                      <span>
                                        R$ {project.budget_min.toLocaleString('pt-BR')} - R$ {project.budget_max.toLocaleString('pt-BR')}
                                      </span>
                                    )}
                                    <span>{project.proposals_count} proposta(s)</span>
                                  </div>
                                  <Button variant="outline" size="sm">Ver detalhes</Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Activity Section */}
                    <div>
                      <h2 className="text-xl font-bold mb-4">Atividade Recente</h2>
                      {posts.length === 0 ? (
                        <div className="text-center py-8">
                          <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-muted-foreground">Nenhuma atividade pública ainda</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {posts.slice(0, 3).map((post) => (
                            <Card key={post.id}>
                              <CardContent className="p-4">
                                <p className="text-sm mb-2">{post.content}</p>
                                {post.media_urls && post.media_urls.length > 0 && (
                                  <div className="grid grid-cols-2 gap-2 mb-2">
                                    {post.media_urls.slice(0, 4).map((url, idx) => (
                                      <SafeImage
                                        key={idx}
                                        src={url}
                                        alt="Post media"
                                        className="w-full h-32 object-cover rounded-lg"
                                      />
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>{post.likes_count} curtidas</span>
                                  <span>{post.comments_count} comentários</span>
                                  <span>{new Date(post.created_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Depoimentos Section */}
                    <PublicTestimonialsSlider entityType="user" entityId={profile.id} />

                    {/* Video Section */}
                    <PublicUserVideo userId={profile.id} />

                    {/* Portfolio Section */}
                    <PublicUserPortfolio userId={profile.id} />

                    {/* Catalog Section */}
                    <PublicUserCatalog userId={profile.id} />

                  </TabsContent>

                  {/* Sobre Tab */}
                  <TabsContent value="sobre" className="p-6">
                    <div className="space-y-4">
                      <h2 className="text-xl font-bold mb-4">Sobre</h2>
                      {profile.bio ? (
                        <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
                      ) : (
                        <p className="text-muted-foreground italic">Este usuário ainda não adicionou uma bio.</p>
                      )}
                      
                      {profile.website && (
                        <div>
                          <h3 className="font-semibold mb-2">Website</h3>
                          <a 
                            href={profile.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {profile.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </TabsContent>

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
                        <Button onClick={() => setShowEvaluationForm(!showEvaluationForm)}>
                          {showEvaluationForm ? 'Cancelar' : 'Avaliar'}
                        </Button>
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
                                    {evaluation.profiles?.avatar_url ? (
                                      <SafeImage
                                        src={evaluation.profiles.avatar_url}
                                        alt={evaluation.profiles.full_name}
                                        className="w-12 h-12 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 flex items-center justify-center">
                                        <UserIcon className="w-7 h-7 text-primary/70" />
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <p className="font-semibold">
                                            {evaluation.profiles?.full_name || 'Usuário'}
                                          </p>
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
                        <Button onClick={() => setShowEvaluationForm(!showEvaluationForm)}>
                          {showEvaluationForm ? 'Cancelar' : 'Avaliar'}
                        </Button>
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
                                    {evaluation.profiles?.avatar_url ? (
                                      <SafeImage
                                        src={evaluation.profiles.avatar_url}
                                        alt={evaluation.profiles.full_name}
                                        className="w-12 h-12 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 flex items-center justify-center">
                                        <UserIcon className="w-7 h-7 text-primary/70" />
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <p className="font-semibold">
                                            {evaluation.profiles?.full_name || 'Usuário'}
                                          </p>
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

              {/* Appointments - below tabs */}
              <PublicUserAppointments userId={profile.id} username={profile.username} />
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
                    <Button 
                      onClick={() => setShowEvaluationForm(true)}
                      className="w-full"
                    >
                      Avaliar Usuário
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* CARD EXCLUSIVO DO USUÁRIO - Estatísticas */}
              <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="font-bold mb-4">Estatísticas</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Projetos</span>
                      <span className="font-semibold">{projects.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Nível de Confiança</span>
                      <Badge variant="outline" className={`${trustLevel.color} text-white border-0 text-xs`}>
                        {trustLevel.label}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Membro desde</span>
                      <span className="text-sm font-semibold">
                        {new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Certifications */}
              <PublicUserCertifications userId={profile.id} />

              {/* Social Links */}
              <PublicUserSocial userId={profile.id} />
            </div>
          </div>
        </div>
      </div>

      <Footer />

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
