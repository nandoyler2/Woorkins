import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Star, Search, Briefcase, MessageSquare, CheckCircle2, Phone, Building2, Users, UserPlus, ThumbsUp, MessageCircle, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
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
}
export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(5);
  
  // Mock data for feed posts
  const feedPosts: FeedPost[] = [
    {
      id: '1',
      author_name: 'Woorkins Team',
      author_role: 'Equipe Woorkins',
      author_avatar: '',
      time_ago: '2h atrás',
      content: 'Nova funcionalidade! Agora você pode negociar diretamente com empresas através da plataforma. Acesse a página de negociações e comece a fechar negócios de forma segura e transparente. 🚀',
      image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=300&fit=crop',
      likes: 248
    },
    {
      id: '2',
      author_name: 'Woorkins Team',
      author_role: 'Equipe Woorkins',
      author_avatar: '',
      time_ago: '1d atrás',
      content: 'Dica da semana: Complete seu perfil empresarial para aumentar suas chances de receber propostas. Empresas com perfis completos recebem 3x mais visualizações! 💼',
      likes: 189
    }
  ];
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);
  
  const loadProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles' as any)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!error && data) {
      setProfile(data as unknown as Profile);
    }
    setLoading(false);
  };
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const profileCompletion = 75; // Mock data
  const memberLevel = 'Membro Prata';
  const points = 1250;
  const maxPoints = 2000;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Welcome Section */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                      Bem-vindo de volta, {profile?.full_name || profile?.username}! 👋
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        <Award className="w-3 h-3 mr-1" />
                        {memberLevel}
                      </Badge>
                      <span className="text-sm text-slate-600">{points} / {maxPoints} pontos</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-600 mb-1">Conclusão do Perfil</div>
                    <div className="text-2xl font-bold text-primary">{profileCompletion}%</div>
                  </div>
                </div>
                
                <Progress value={profileCompletion} className="h-2 mb-6" />

                {/* Profile Completion Tasks */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                    <p className="text-sm font-medium text-slate-900">
                      Complete seu perfil para desbloquear mais recursos
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 ml-8">
                    <Button variant="outline" size="sm" className="text-xs">
                      <Building2 className="w-3 h-3 mr-1" />
                      Adicionar Itens do Portfólio
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Phone className="w-3 h-3 mr-1" />
                      Verificar Número de Telefone
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Briefcase className="w-3 h-3 mr-1" />
                      Completar Perfil Empresarial
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Cards Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">Escrever Avaliação</h3>
                  <p className="text-blue-100 text-sm">Compartilhe sua experiência</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-teal-500 to-teal-600 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Search className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">Encontrar Serviços</h3>
                  <p className="text-teal-100 text-sm">Descubra negócios</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">Atualizar Portfólio</h3>
                  <p className="text-orange-100 text-sm">Mostre seu trabalho</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
                <Link to="/messages">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      {unreadMessages > 0 && (
                        <Badge className="bg-red-500 text-white border-0">{unreadMessages}</Badge>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">Ver Mensagens</h3>
                    <p className="text-green-100 text-sm">Verificar conversas</p>
                  </CardContent>
                </Link>
              </Card>
            </div>

            {/* Social Feed */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-slate-700" />
                  <h2 className="text-xl font-bold text-slate-900">Artigos e Novidades</h2>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {feedPosts.map((post) => (
                  <div key={post.id} className="p-6 border-b border-slate-100 last:border-0">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={post.author_avatar} />
                        <AvatarFallback className="bg-primary text-white">W</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-slate-900">{post.author_name}</h4>
                            <p className="text-sm text-slate-600">{post.author_role} • {post.time_ago}</p>
                          </div>
                          <Button variant="outline" size="sm">Seguir</Button>
                        </div>
                        <p className="text-slate-700 mb-3 leading-relaxed">{post.content}</p>
                        {post.image_url && (
                          <img 
                            src={post.image_url} 
                            alt="Post content" 
                            className="w-full h-64 object-cover rounded-lg mb-3"
                          />
                        )}
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <button className="flex items-center gap-1 hover:text-primary transition-colors">
                            <ThumbsUp className="w-4 h-4" />
                            <span>{post.likes}</span>
                          </button>
                          <button className="flex items-center gap-1 hover:text-primary transition-colors">
                            <MessageCircle className="w-4 h-4" />
                            <span>Compartilhar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Statistics Card */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Award className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Suas Estatísticas</h3>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Star className="w-5 h-5 text-yellow-600" />
                    </div>
                    <span className="text-slate-700 font-medium">Avaliações Dadas</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900">23</span>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-slate-700 font-medium">Avaliações Recebidas</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900">18</span>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-slate-700 font-medium">Seguidores</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900">156</span>
                </div>
                
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-slate-700 font-medium">Seguindo</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900">89</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}