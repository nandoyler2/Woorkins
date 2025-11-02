import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthAction } from '@/contexts/AuthActionContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, Calendar, User, MessageSquare, 
  Send, Star, ChevronRight, Target, FileText,
  Briefcase, Clock, Users, AlertCircle, CheckCircle
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { formatShortName } from '@/lib/utils';
import { ProposalDialog } from '@/components/projects/ProposalDialog';
import { ViewProposalDialog } from '@/components/projects/ViewProposalDialog';
import { LoginPromptDialog } from '@/components/projects/LoginPromptDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProfileAvatarWithHover } from '@/components/ProfileAvatarWithHover';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  status: string;
  proposals_count: number;
  created_at: string;
  profile_id: string;
  profiles: {
    username: string;
    full_name: string;
    user_id: string;
    avatar_url?: string | null;
    avatar_thumbnail_url?: string | null;
  };
}

interface Proposal {
  id: string;
  message: string;
  budget: number;
  delivery_days: number;
  status: string;
  created_at: string;
  freelancer_id: string;
  profiles: {
    username: string;
    full_name: string;
  };
  business_profiles: {
    id: string;
    company_name: string;
    slug: string;
  } | null;
}

export default function ProjectDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { requireAuth } = useAuthAction();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [hasProposal, setHasProposal] = useState(false);
  const [userProposal, setUserProposal] = useState<any>(null);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [viewProposalDialogOpen, setViewProposalDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  useEffect(() => {
    if (project) {
      document.title = `${project.title} - Woorkins`;
    } else {
      document.title = 'Projeto - Woorkins';
    }
  }, [project]);

  useEffect(() => {
    loadProjectData();
  }, [id, user]);

  useEffect(() => {
    const checkUserProposal = async () => {
      if (!user || !id) {
        setHasProposal(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles' as any)
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile) return;

        const profileData = profile as any;

        const { data: proposal } = await supabase
          .from('proposals' as any)
          .select('budget, delivery_days, message, created_at')
          .eq('project_id', id)
          .eq('freelancer_id', profileData.id)
          .single();

        if (proposal) {
          setUserProposal(proposal);
          setHasProposal(true);
        } else {
          setHasProposal(false);
        }
      } catch (error) {
        setHasProposal(false);
      }
    };

    checkUserProposal();
  }, [user, id]);

  const handleMakeProposal = () => {
    if (hasProposal) {
      setViewProposalDialogOpen(true);
      return;
    }
    
    if (requireAuth(() => setProposalDialogOpen(true))) {
      setProposalDialogOpen(true);
    }
  };

  const handleProposalSuccess = () => {
    setProposalDialogOpen(false);
    // Recarregar a proposta
    const checkUserProposal = async () => {
      if (!user || !id) return;

      try {
        const { data: profile } = await supabase
          .from('profiles' as any)
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile) return;

        const profileData = profile as any;

        const { data: proposal } = await supabase
          .from('proposals' as any)
          .select('budget, delivery_days, message, created_at')
          .eq('project_id', id)
          .eq('freelancer_id', profileData.id)
          .single();

        if (proposal) {
          setUserProposal(proposal);
          setHasProposal(true);
        }
      } catch (error) {
        console.error('Error fetching proposal:', error);
      }
    };
    checkUserProposal();
  };

  const loadProjectData = async () => {
    if (!id) return;

    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects' as any)
        .select(`
          *,
          profiles:profile_id (
            username,
            full_name,
            user_id,
            avatar_url,
            avatar_thumbnail_url
          )
        `)
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData as any);

      const { data: proposalsData } = await supabase
        .from('proposals' as any)
        .select(`
          *,
          profiles:freelancer_id (
            username,
            full_name
          ),
          business_profiles:business_id (
            id,
            company_name,
            slug
          )
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (proposalsData) {
        setProposals(proposalsData as any);
      }
    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o projeto',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'há poucos minutos';
    if (diffInHours < 24) return `há ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'há 1 dia';
    if (diffInDays < 30) return `há ${diffInDays} dias`;
    const diffInMonths = Math.floor(diffInDays / 30);
    return `há ${diffInMonths} ${diffInMonths === 1 ? 'mês' : 'meses'}`;
  };

  const handleReport = async () => {
    if (!user || !project) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para denunciar',
        variant: 'destructive',
      });
      return;
    }

    if (!reportReason.trim()) {
      toast({
        title: 'Erro',
        description: 'Selecione um motivo para a denúncia',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) throw new Error('Profile not found');

      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: profileData.id,
          content_type: 'project',
          content_id: project.id,
          reason: reportReason,
          description: reportDescription.trim() || null
        });

      if (error) throw error;

      toast({
        title: 'Denúncia enviada',
        description: 'Obrigado por nos ajudar a manter a comunidade segura.',
      });

      setReportDialogOpen(false);
      setReportReason('');
      setReportDescription('');
    } catch (error) {
      console.error('Error reporting project:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a denúncia',
        variant: 'destructive',
      });
    }
  };


  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return 'A combinar';
    if (min && max) return `R$ ${min.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - R$ ${max.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (min) return `A partir de R$ ${min.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `Até R$ ${max?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center max-w-woorkins">
          <h1 className="text-4xl font-bold mb-4">Projeto não encontrado</h1>
          <Button asChild className="bg-gradient-primary">
            <Link to="/projetos">Voltar</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = user && project.profiles.user_id === user.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Header />
      
      <div className="container mx-auto px-4 py-6 max-w-woorkins">
        {/* Breadcrumbs */}
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">Woorkins</Link>
          <ChevronRight className="inline w-3 h-3 mx-1" />
          <Link to="/projetos" className="hover:text-primary">Projetos</Link>
          <ChevronRight className="inline w-3 h-3 mx-1" />
          <span className="text-foreground">{project.category || 'Projeto'}</span>
        </nav>

        {/* Project Title */}
        <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Publicado em {new Date(project.created_at).toLocaleDateString('pt-BR')} para {project.category || 'Projetos'}
        </p>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Project Details */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="project" className="space-y-4">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="project" className="data-[state=active]:bg-gradient-primary">
                  Projeto
                </TabsTrigger>
                <TabsTrigger value="competitors">
                  Propostas recebidas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="project" className="space-y-6">
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    {/* Sobre este projeto */}
                    <div>
                      <h2 className="text-xl font-bold mb-4">Sobre este projeto</h2>
                      
                      <div className="space-y-4">
                        {/* Objetivo */}
                        <div className="flex gap-3">
                          <Target className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold mb-2">🎯 Objetivo</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                              {project.description}
                            </p>
                          </div>
                        </div>

                        <Separator />

                        {/* Escopo de Trabalho */}
                        <div className="flex gap-3">
                          <Briefcase className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold mb-2">💼 Escopo de Trabalho</h3>
                            <p className="text-sm text-muted-foreground">
                              Detalhes adicionais sobre o escopo do projeto serão compartilhados durante a negociação.
                            </p>
                          </div>
                        </div>

                        {project.category && (
                          <>
                            <Separator />
                            <div className="flex gap-3">
                              <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                              <div>
                                <h3 className="font-semibold mb-2">📄 Categoria</h3>
                                <Badge variant="secondary" className="bg-gradient-secondary">
                                  {project.category}
                                </Badge>
                              </div>
                            </div>
                          </>
                        )}

                        {project.deadline && (
                          <>
                            <Separator />
                            <div className="flex gap-3">
                              <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                              <div>
                                <h3 className="font-semibold mb-2">⏰ Prazo</h3>
                                <p className="text-sm text-muted-foreground">
                                  Prazo de entrega: {new Date(project.deadline).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="competitors">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{proposals.length} proposta{proposals.length !== 1 ? 's' : ''} recebida{proposals.length !== 1 ? 's' : ''}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4">
            {/* Budget Card */}
            <Card className="sticky top-4">
              <CardContent className="pt-6 space-y-4">
                {/* Budget */}
                <div className="text-center py-4">
                  <p className="text-3xl font-bold text-primary">
                    {formatBudget(project.budget_min, project.budget_max)}
                  </p>
                  {project.budget_min && project.budget_max && (
                    <p className="text-sm text-muted-foreground mt-1">/ hora</p>
                  )}
                </div>

                {/* Action Button */}
                {!isOwner && project.status === 'open' && (
                  <Button 
                    className="w-full bg-gradient-primary hover:opacity-90 shadow-glow"
                    onClick={handleMakeProposal}
                    style={hasProposal ? { backgroundColor: '#11AA9B' } : undefined}
                  >
                    {hasProposal ? 'Você já enviou a proposta' : 'Fazer uma proposta'}
                  </Button>
                )}

                {!user && project.status === 'open' && (
                  <Button asChild className="w-full bg-gradient-primary">
                    <Link to="/auth">Fazer Login para Propor</Link>
                  </Button>
                )}

                <Separator />

                {/* Client Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <ProfileAvatarWithHover
                      profileId={project.profile_id}
                      username={project.profiles.username}
                      avatarUrl={project.profiles.avatar_thumbnail_url || project.profiles.avatar_url}
                      size="sm"
                    />
                    <div>
                      <p className="font-semibold">{formatShortName(project.profiles.full_name)}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        ))}
                        <CheckCircle className="w-3 h-3 text-green-500 ml-1" />
                      </div>
                    </div>
                  </div>

                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Projetos publicados</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Projetos pagos</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Membro desde</span>
                      <span className="font-medium">{new Date(project.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Activities */}
                <div>
                  <h3 className="font-semibold mb-3">Atividades neste projeto</h3>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Propostas</span>
                      <span className="font-medium">{project.proposals_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Última resposta</span>
                      <span className="font-medium">{getTimeAgo(project.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Freelancers interessados</span>
                      <span className="font-medium">{proposals.length}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Report */}
                <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Denunciar como inadequado
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Denunciar Conteúdo Inadequado</DialogTitle>
                      <DialogDescription>
                        Ajude-nos a manter a comunidade segura. Sua denúncia será analisada pela nossa equipe.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Motivo da denúncia *</Label>
                        <Select value={reportReason} onValueChange={setReportReason}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o motivo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spam">Spam ou propaganda</SelectItem>
                            <SelectItem value="inappropriate">Conteúdo inadequado</SelectItem>
                            <SelectItem value="fraud">Fraude ou golpe</SelectItem>
                            <SelectItem value="harassment">Assédio ou bullying</SelectItem>
                            <SelectItem value="fake">Informações falsas</SelectItem>
                            <SelectItem value="other">Outro motivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Descrição adicional (opcional)</Label>
                        <Textarea
                          placeholder="Forneça mais detalhes sobre o problema..."
                          value={reportDescription}
                          onChange={(e) => setReportDescription(e.target.value)}
                          rows={4}
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setReportDialogOpen(false);
                            setReportReason('');
                            setReportDescription('');
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={handleReport}
                          disabled={!reportReason}
                        >
                          Enviar Denúncia
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Dialogs */}
      {project && (
        <>
          <ProposalDialog
            open={proposalDialogOpen}
            onOpenChange={(open) => {
              setProposalDialogOpen(open);
              if (!open) {
                handleProposalSuccess();
              }
            }}
            projectId={project.id}
            projectTitle={project.title}
            projectCreatedAt={project.created_at}
            proposalsCount={project.proposals_count}
          />

          <ViewProposalDialog
            open={viewProposalDialogOpen}
            onOpenChange={setViewProposalDialogOpen}
            proposal={userProposal}
            projectTitle={project.title}
          />

          <LoginPromptDialog
            open={loginDialogOpen}
            onOpenChange={setLoginDialogOpen}
            onLoginSuccess={() => {
              setLoginDialogOpen(false);
              setProposalDialogOpen(true);
            }}
          />
        </>
      )}

      <Footer />
    </div>
  );
}
