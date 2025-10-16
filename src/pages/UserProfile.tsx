import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Calendar, User as UserIcon, Star, Briefcase } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { SafeImage } from '@/components/ui/safe-image';
import { useToast } from '@/hooks/use-toast';
import { formatFullName } from '@/lib/utils';

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

export default function UserProfile() {
  const { username } = useParams();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sobre');

  useEffect(() => {
    loadUserProfile();
  }, [username]);

  const loadUserProfile = async () => {
    if (!username) return;

    try {
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
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
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
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

      {/* Cover - simples com gradiente */}
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
                        <div className="w-36 h-36 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center border-4 border-background shadow-lg">
                          <UserIcon className="w-12 h-12 text-primary" />
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
                      value="sobre" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                    >
                      Sobre
                    </TabsTrigger>
                    <TabsTrigger 
                      value="projetos"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                    >
                      Projetos ({projects.length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="atividade"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                    >
                      Atividade
                    </TabsTrigger>
                  </TabsList>

                  {/* Sobre Tab */}
                  <TabsContent value="sobre" className="p-6 space-y-6">
                    <div>
                      <h2 className="text-xl font-bold mb-4">Sobre</h2>
                      <div className="space-y-4">
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
                    </div>
                  </TabsContent>

                  {/* Projetos Tab */}
                  <TabsContent value="projetos" className="p-6">
                    <h2 className="text-xl font-bold mb-6">Projetos Públicos</h2>
                    {projects.length === 0 ? (
                      <div className="text-center py-12">
                        <Briefcase className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground">Nenhum projeto público ainda</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {projects.map((project) => (
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
                  </TabsContent>

                  {/* Atividade Tab */}
                  <TabsContent value="atividade" className="p-6">
                    <h2 className="text-xl font-bold mb-6">Atividade Recente</h2>
                    {posts.length === 0 ? (
                      <div className="text-center py-12">
                        <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground">Nenhuma atividade pública ainda</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {posts.map((post) => (
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
                  </TabsContent>
                </Tabs>
              </Card>
            </div>

            {/* Right Column - Info Sidebar */}
            <div className="space-y-4">
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

              {profile.website && (
                <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-lg">
                  <CardContent className="p-6">
                    <h3 className="font-bold mb-4">Links</h3>
                    <a 
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm break-all"
                    >
                      {profile.website}
                    </a>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
