import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Star, Search, Briefcase, MessageSquare, CheckCircle2, Phone, Building2, Users, UserPlus, ThumbsUp, MessageCircle, Award, Activity, TrendingUp, Bell, Clock, Trophy, Share2, Heart, Bookmark, Camera, Mail, FileCheck } from 'lucide-react';
import woorkoinsIcon from '@/assets/woorkoins-icon-latest.png';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatShortName } from '@/lib/utils';
import { ProfileEditDialog } from '@/components/ProfileEditDialog';
import { IdentityVerificationDialog } from '@/components/IdentityVerificationDialog';
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(5);
  const [woorkoinsBalance, setWoorkoinsBalance] = useState(0);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  
  // Mock data for feed posts
  const feedPosts: FeedPost[] = [
    {
      id: '1',
      author_name: 'Maria Santos',
      author_role: 'Especialista em Marketing',
      author_avatar: '',
      time_ago: '2h atrás',
      content: 'Acabei de concluir um projeto incrível com a TechCorp! A equipe deles foi extremamente profissional e entregou exatamente o que precisávamos. A atenção aos detalhes e comunicação durante todo o processo foi excepcional. Recomendo muito os serviços deles para qualquer pessoa que procura trabalho de desenvolvimento web de qualidade. 🚀',
      image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=300&fit=crop',
      likes: 24,
      comments: 8
    },
    {
      id: '2',
      author_name: 'Carlos Rodriguez',
      author_role: 'Designer Freelancer',
      author_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      time_ago: '4h atrás',
      content: 'Animado para compartilhar meu último design de logo para um restaurante local! 🎨 O cliente queria algo moderno mas acolhedor, refletindo sua herança familiar. Após várias iterações, chegamos a essa bela combinação de tipografia e iconografia. O que vocês acham? Adoraria ouvir seus comentários!',
      image_url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&h=300&fit=crop',
      likes: 42,
      comments: 15
    },
    {
      id: '3',
      author_name: 'Ana Costa',
      author_role: 'Consultora de Negócios',
      author_avatar: '',
      time_ago: '8h atrás',
      content: 'Ótimo evento de networking ontem à noite! Conheci tantos profissionais talentosos e potenciais colaboradores. Uma lição importante que compartilharam sobre gestão de projetos: você pode planejar, mas o valor que você pode oferecer aos outros. Ansioso para fazer follow-up com todos vocês e ver o que aprenderam. A Comunidade Woorkins continua me impressionando! 👏',
      likes: 18,
      comments: 6
    }
  ];

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
    if (user) {
      loadProfile();
      checkEmailConfirmation();
    }
  }, [user]);

  const checkEmailConfirmation = async () => {
    if (!user) return;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setEmailConfirmed(!!authUser?.email_confirmed_at);
  };
  
  const loadProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles' as any)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!error && data) {
      const profileData = data as unknown as Profile;
      setProfile(profileData);
      await loadBusinessProfiles(profileData.id);
      await loadWoorkoinsBalance(profileData.id);
    }
    setLoading(false);
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
        action: () => setShowProfileEdit(true),
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

  // Animação de confete quando completar tudo
  useEffect(() => {
    const allCompleted = profileTasks.every(t => t.completed);
    if (allCompleted && !hasShownConfetti && !loading) {
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

      setHasShownConfetti(true);
      
      // Remover seção após 5 segundos
      setTimeout(() => {
        setProfileCompleted(true);
      }, 5000);
    }
  }, [profileTasks, hasShownConfetti, loading]);

  const loadWoorkoinsBalance = async (profileId: string) => {
    const { data, error } = await supabase
      .from('woorkoins_balance')
      .select('balance')
      .eq('profile_id', profileId)
      .maybeSingle();
    
    if (!error && data) {
      setWoorkoinsBalance(data.balance || 0);
    }
  };

  const loadBusinessProfiles = async (profileId: string) => {
    const { data, error } = await supabase
      .from('business_profiles' as any)
      .select('id, company_name, category, logo_url, slug')
      .eq('profile_id', profileId);
    
    if (!error && data) {
      setBusinessProfiles(data as unknown as BusinessProfile[]);
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const accountType = 'Conta Grátis';
  const points = 1250;
  const maxPoints = 2000;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
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
                      <Badge variant="secondary" className="text-xs px-3 py-1 bg-primary/10 text-primary border border-primary/20">
                        <Award className="w-3 h-3 mr-1" />
                        {accountType}
                      </Badge>
                      <Link 
                        to="/woorkoins" 
                        className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary transition-colors cursor-pointer group"
                      >
                        <img src={woorkoinsIcon} alt="Woorkoins" className="h-5 w-auto object-contain group-hover:scale-110 transition-transform" />
                        <span className="font-semibold">{woorkoinsBalance.toLocaleString()}</span>
                        <span>Woorkoins</span>
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
                          {pendingTasks.map((task) => (
                            <Button
                              key={task.id}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 border-slate-300 hover:border-primary hover:text-primary"
                              onClick={task.action}
                            >
                              <task.icon className="w-3 h-3 mr-1" />
                              {task.title}
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

                {/* Completed Tasks Display */}
                {profileTasks.some(t => t.completed) && !profileCompleted && (
                  <div className="mt-3 flex flex-wrap gap-2 ml-8">
                    {profileTasks.filter(t => t.completed).map((task) => (
                      <Button
                        key={task.id}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 border-green-500 text-green-600 bg-green-50 cursor-default"
                        disabled
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {task.title} - Concluído
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group">
                <CardContent className="p-5">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-0.5">Escrever Avaliação</h3>
                  <p className="text-blue-100 text-xs">Compartilhe sua experiência</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-teal-500 to-teal-600 border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group">
                <CardContent className="p-5">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-0.5">Encontrar Serviços</h3>
                  <p className="text-teal-100 text-xs">Descubra negócios</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group">
                <CardContent className="p-5">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-0.5">Atualizar Portfólio</h3>
                  <p className="text-orange-100 text-xs">Mostre seu trabalho</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group relative">
                <Link to="/mensagens">
                  <CardContent className="p-5">
                    {unreadMessages > 0 && (
                      <Badge className="absolute top-3 right-3 bg-red-500 text-white border-0 w-5 h-5 flex items-center justify-center p-0 text-xs">
                        {unreadMessages}
                      </Badge>
                    )}
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-0.5">Ver Mensagens</h3>
                    <p className="text-green-100 text-xs">Verificar conversas</p>
                  </CardContent>
                </Link>
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
                {feedPosts.map((post) => (
                  <div key={post.id} className="p-4 border-b border-slate-100 last:border-0">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={post.author_avatar} />
                        <AvatarFallback className="bg-slate-200 text-slate-600 text-sm">
                          {post.author_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <h4 className="font-semibold text-sm text-slate-900">{post.author_name}</h4>
                            <p className="text-xs text-slate-600">{post.author_role} • {post.time_ago}</p>
                          </div>
                          <Button variant="default" size="sm" className="h-7 text-xs px-3">
                            Seguir
                          </Button>
                        </div>
                        <p className="text-sm text-slate-700 mb-2 leading-relaxed">{post.content}</p>
                        {post.image_url && (
                          <img 
                            src={post.image_url} 
                            alt="Post content" 
                            className="w-full h-48 object-cover rounded-lg mb-2"
                          />
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
                            <Heart className="w-4 h-4" />
                            <span>{post.likes}</span>
                          </button>
                          <button className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                            <MessageCircle className="w-4 h-4" />
                            <span>{post.comments}</span>
                          </button>
                          <button className="flex items-center gap-1 hover:text-green-500 transition-colors">
                            <Share2 className="w-4 h-4" />
                            <span>Compartilhar</span>
                          </button>
                          <button className="ml-auto hover:text-blue-500 transition-colors">
                            <Bookmark className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="p-4 text-center">
                  <Button variant="outline" size="sm" className="text-sm">
                    Carregar mais postagens
                  </Button>
                </div>
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
                  <h3 className="text-base font-bold text-slate-900">Perfil de interações no Woorkins</h3>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-blue-300 bg-white hover:shadow-md transition-all">
                  <Avatar className="h-10 w-10 border-2 border-blue-400">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={profile.username} />
                    ) : (
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {profile?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 truncate">
                      {formatShortName(profile?.full_name) || profile?.username}
                    </h4>
                    <p className="text-xs text-blue-600 truncate">@{profile?.username}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link to={`/perfil/${profile?.username}`}>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2 border-blue-400 text-blue-600 hover:bg-blue-50">
                        Ver perfil
                      </Button>
                    </Link>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="text-xs h-7 px-2 bg-blue-500 hover:bg-blue-600"
                      onClick={() => setShowProfileEdit(true)}
                    >
                      Editar
                    </Button>
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
                  <Link to="/empresa/novo/editar">
                    <Button variant="outline" size="sm" className="text-xs h-7">
                      + Criar Perfil
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {businessProfiles.length === 0 ? (
                  <div className="text-center py-6">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 mb-3">Você ainda não criou nenhum perfil profissional</p>
                    <Link to="/empresa/novo/editar">
                      <Button variant="default" size="sm">
                        Criar Primeiro Perfil
                      </Button>
                    </Link>
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
                          {business.category && (
                            <p className="text-xs text-slate-600 truncate">{business.category}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Link to={`/${business.slug || business.id}`}>
                            <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                              Ver perfil
                            </Button>
                          </Link>
                          <Link to={`/empresa/${business.slug || business.id}/editar`}>
                            <Button variant="default" size="sm" className="text-xs h-7 px-2">
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

      {/* Dialog de edição de perfil */}
      {user && profile && (
        <>
          <ProfileEditDialog
            open={showProfileEdit}
            onOpenChange={setShowProfileEdit}
            userId={user.id}
            onUpdate={loadProfile}
          />
          <IdentityVerificationDialog
            open={showVerificationDialog}
            onOpenChange={setShowVerificationDialog}
            profileId={profile.id}
            registeredName={profile.full_name || ''}
            registeredCPF={profile.cpf || ''}
          />
        </>
      )}
    </div>
  );
}