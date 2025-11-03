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
  Briefcase, Clock, Users, AlertCircle, CheckCircle, Trash2,
  Shield, Flag, Zap, UserX, FileWarning
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatShortName } from '@/lib/utils';
import { ProposalDialog } from '@/components/projects/ProposalDialog';
import { ViewProposalDialog } from '@/components/projects/ViewProposalDialog';
import { LoginPromptDialog } from '@/components/projects/LoginPromptDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProfileAvatarWithHover } from '@/components/ProfileAvatarWithHover';
import { MarkdownText } from '@/lib/markdownUtils';

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
  const [ownerSubscriptionPlan, setOwnerSubscriptionPlan] = useState<string>('free');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      const typedProject = projectData as any;
      setProject(typedProject);

      // Load owner's subscription plan
      if (typedProject?.profile_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles' as any)
          .select('subscription_plan')
          .eq('id', typedProject.profile_id)
          .single();
        
        if (ownerProfile) {
          setOwnerSubscriptionPlan((ownerProfile as any).subscription_plan || 'free');
        }
      }

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

    // Validação do comprimento da descrição
    if (reportDescription.length > 500) {
      toast({
        title: 'Erro',
        description: 'A descrição não pode ter mais de 500 caracteres',
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

      // Sanitiza a descrição removendo caracteres perigosos
      const sanitizedDescription = reportDescription
        .trim()
        .replace(/[<>]/g, '') // Remove tags HTML básicas
        .slice(0, 500); // Garante limite máximo

      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: profileData.id,
          content_type: 'project',
          content_id: project.id,
          reason: reportReason,
          description: sanitizedDescription || null
        });

      if (error) throw error;

      toast({
        title: '✓ Denúncia enviada com sucesso',
        description: 'Nossa equipe analisará sua denúncia em até 24 horas. Obrigado por manter a comunidade segura!',
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

  const handleDeleteProject = async () => {
    if (!user || !project || !isOwner) {
      toast({
        title: 'Erro',
        description: 'Você não tem permissão para excluir este projeto',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: 'Projeto excluído',
        description: 'O projeto foi excluído com sucesso.',
      });

      navigate('/projetos');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o projeto',
        variant: 'destructive',
      });
      setIsDeleting(false);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-900 via-teal-700 to-blue-900 text-white py-8">
        <div className="container mx-auto px-4 max-w-woorkins">
          {/* Breadcrumbs */}
          <nav className="mb-4 text-sm text-blue-200 flex items-center">
            <Link to="/" className="hover:text-white transition-colors">Woorkins</Link>
            <ChevronRight className="w-3 h-3 mx-2" />
            <Link to="/projetos" className="hover:text-white transition-colors">Projetos</Link>
            <ChevronRight className="w-3 h-3 mx-2" />
            <span className="text-white">{project.category || 'Projeto'}</span>
          </nav>

          {/* Project Title */}
          <h1 className="text-4xl font-bold mb-2">{project.title}</h1>
          <p className="text-blue-100">
            Publicado em {new Date(project.created_at).toLocaleDateString('pt-BR')} • {project.category || 'Projetos'}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-woorkins">

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Project Details */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="project" className="space-y-4">
              <TabsList className="w-full grid grid-cols-2 bg-card/50 backdrop-blur-sm border-2 p-1">
                <TabsTrigger 
                  value="project" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-teal-600 data-[state=active]:text-white"
                >
                  Projeto
                </TabsTrigger>
                <TabsTrigger 
                  value="competitors"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-teal-600 data-[state=active]:text-white"
                >
                  Propostas recebidas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="project" className="space-y-6 animate-fade-in">
                <Card className="border-2 bg-card/50 backdrop-blur-sm shadow-lg">
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
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              <MarkdownText text={project.description} />
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

              <TabsContent value="competitors" className="animate-fade-in">
                <Card className="border-2 bg-card/50 backdrop-blur-sm shadow-lg">
                  <CardContent className="pt-6">
                    {proposals.length === 0 ? (
                      <div className="text-center py-16 px-6">
                        {hasProposal ? (
                          // Usuário já enviou proposta
                          <>
                            {/* Ícone com gradiente e animação */}
                            <div className="relative inline-block mb-6">
                              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-teal-500 rounded-full blur-xl opacity-30 animate-pulse-slow"></div>
                              <div className="relative bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950 p-6 rounded-full border-4 border-green-500/20">
                                <CheckCircle className="w-16 h-16 text-green-600" />
                              </div>
                            </div>
                            
                            {/* Título com gradiente */}
                            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                              Proposta Enviada com Sucesso!
                            </h3>
                            
                            {/* Descrição */}
                            <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
                              Você já enviou uma proposta para este projeto. O cliente irá analisá-la e entrará em contato em breve.
                            </p>
                            
                            {/* Botão destacado */}
                            <div className="space-y-3">
                              <Button 
                                onClick={() => setViewProposalDialogOpen(true)}
                                size="lg"
                                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-300 text-lg px-8 py-6 h-auto"
                              >
                                <MessageSquare className="w-5 h-5 mr-3" />
                                Ver Sua Proposta
                              </Button>
                              
                              {/* Status */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 text-sm">
                                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <span>Proposta enviada</span>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                  <Clock className="w-4 h-4 text-yellow-500" />
                                  <span>Aguardando análise</span>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                  <MessageSquare className="w-4 h-4 text-blue-500" />
                                  <span>Chat disponível</span>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          // Nenhuma proposta ainda
                          <>
                            {/* Ícone com gradiente e animação */}
                            <div className="relative inline-block mb-6">
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full blur-xl opacity-30 animate-pulse-slow"></div>
                              <div className="relative bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950 dark:to-teal-950 p-6 rounded-full border-4 border-primary/20">
                                <MessageSquare className="w-16 h-16 text-primary" />
                              </div>
                            </div>
                            
                            {/* Título com gradiente */}
                            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                              Nenhuma proposta enviada ainda
                            </h3>
                            
                            {/* Descrição */}
                            <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
                              Seja o primeiro a enviar uma proposta para este projeto e tenha mais chances de ser selecionado!
                            </p>
                            
                            {/* Botão destacado */}
                            {!isOwner && (
                              <div className="space-y-3">
                                <Button 
                                  onClick={handleMakeProposal}
                                  size="lg"
                                  className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-300 text-lg px-8 py-6 h-auto"
                                >
                                  <Send className="w-5 h-5 mr-3" />
                                  Enviar Primeira Proposta
                                </Button>
                                
                                {/* Benefícios */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 text-sm">
                                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span>Resposta rápida</span>
                                  </div>
                                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span>Pagamento seguro</span>
                                  </div>
                                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span>Sem taxas ocultas</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : ownerSubscriptionPlan === 'free' && isOwner ? (
                      <div className="text-center py-12">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
                        <h3 className="text-xl font-semibold mb-2">Upgrade para Premium</h3>
                        <p className="text-muted-foreground mb-2">Apenas usuários Premium podem ver propostas recebidas</p>
                        <p className="text-sm text-muted-foreground mb-6">
                          Você tem {proposals.length} proposta{proposals.length !== 1 ? 's' : ''} aguardando visualização
                        </p>
                        <Button 
                          asChild
                          className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
                        >
                          <Link to="/planos">Ver planos Premium</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold mb-4">
                          {proposals.length} proposta{proposals.length !== 1 ? 's' : ''} recebida{proposals.length !== 1 ? 's' : ''}
                        </h3>
                        {/* Aqui você pode adicionar a lista de propostas quando implementar */}
                        <p className="text-sm text-muted-foreground">
                          Visualização detalhada de propostas em desenvolvimento
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4">
            {/* Budget Card com gradiente */}
            <Card className="sticky top-4 border-2 bg-card/50 backdrop-blur-sm shadow-lg">
              {/* Header com gradiente */}
              <div className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 p-4 border-b-2 border-primary/20">
                <h3 className="text-lg font-bold text-center bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                  Orçamento do Projeto
                </h3>
              </div>
              
              <CardContent className="pt-6 space-y-4">
                {/* Budget */}
                <div className="text-center py-4 bg-gradient-to-br from-blue-50/50 to-teal-50/50 dark:from-blue-950/20 dark:to-teal-950/20 rounded-lg border-2 border-primary/20">
                  <p className="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent whitespace-nowrap overflow-hidden text-ellipsis px-2">
                    {formatBudget(project.budget_min, project.budget_max)}
                  </p>
                  {project.budget_min && project.budget_max && (
                    <p className="text-sm text-muted-foreground mt-1">Orçamento total</p>
                  )}
                </div>

                {/* Action Button */}
                {isOwner && project.status === 'open' && (
                  <div className="space-y-2">
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-md cursor-default"
                      disabled
                    >
                      ✨ Seu Projeto
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-2 hover:border-primary/50"
                      asChild
                    >
                      <Link to={`/projeto/${project.id}/editar`}>
                        Editar Projeto
                      </Link>
                    </Button>
                  </div>
                )}
                
                {!isOwner && project.status === 'open' && (
                  <Button 
                    className={`w-full shadow-md ${hasProposal ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700' : 'bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700'}`}
                    onClick={handleMakeProposal}
                  >
                    {hasProposal ? '✅ Ver Sua Proposta' : '📝 Fazer uma Proposta'}
                  </Button>
                )}

                {!user && project.status === 'open' && (
                  <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 shadow-md">
                    <Link to="/auth">🔐 Fazer Login para Propor</Link>
                  </Button>
                )}

                <Separator />

                {/* Client Info */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Sobre o Cliente</h4>
                  <div className="flex items-center gap-3">
                    <ProfileAvatarWithHover
                      profileId={project.profile_id}
                      username={project.profiles.username}
                      avatarUrl={project.profiles.avatar_thumbnail_url || project.profiles.avatar_url}
                      size="md"
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

                  <div className="text-sm space-y-2 bg-muted/30 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">📊 Projetos publicados</span>
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">0</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">💰 Projetos pagos</span>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600">0</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">📅 Membro desde</span>
                      <span className="font-medium">{new Date(project.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</span>
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

                {/* Owner Actions */}
                {isOwner && (
                  <>
                    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir projeto
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O projeto e todas as propostas associadas serão excluídos permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteProject}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isDeleting ? 'Excluindo...' : 'Excluir'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Separator />
                  </>
                )}

                {/* Report */}
                {!isOwner && (
                  <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Denunciar como inadequado
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] border-2 shadow-2xl">
                      {/* Header com gradiente */}
                      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-orange-600 to-red-600"></div>
                      
                      <DialogHeader className="space-y-3 pt-2">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 rounded-full border-2 border-red-500/20">
                            <Shield className="w-6 h-6 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <DialogTitle className="text-xl bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                              Denunciar Conteúdo Inadequado
                            </DialogTitle>
                          </div>
                        </div>
                        <DialogDescription className="text-base">
                          Ajude-nos a manter a comunidade segura. Sua denúncia será analisada pela nossa equipe de moderação com confidencialidade.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-5 pt-4">
                        <div className="space-y-2">
                          <Label className="text-base font-semibold">Motivo da denúncia *</Label>
                          <Select value={reportReason} onValueChange={setReportReason}>
                            <SelectTrigger className="h-11 border-2">
                              <SelectValue placeholder="Selecione o motivo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="offensive">
                                <div className="flex items-center gap-2">
                                  <UserX className="w-4 h-4 text-red-600" />
                                  <span>Conteúdo ofensivo ou discurso de ódio</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="spam">
                                <div className="flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-orange-600" />
                                  <span>Spam ou publicidade enganosa</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="harassment">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-red-600" />
                                  <span>Assédio ou bullying</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="copyright">
                                <div className="flex items-center gap-2">
                                  <FileWarning className="w-4 h-4 text-yellow-600" />
                                  <span>Violação de direitos autorais</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="fraud">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-orange-600" />
                                  <span>Fraude ou golpe</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="fake">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-red-600" />
                                  <span>Informações falsas ou enganosas</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="inappropriate">
                                <div className="flex items-center gap-2">
                                  <Flag className="w-4 h-4 text-purple-600" />
                                  <span>Conteúdo inadequado ou impróprio</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="other">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                  <span>Outro motivo</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-base font-semibold">Descrição adicional (opcional)</Label>
                          <Textarea
                            placeholder="Forneça mais detalhes sobre o problema para ajudar nossa equipe..."
                            value={reportDescription}
                            onChange={(e) => setReportDescription(e.target.value)}
                            rows={4}
                            className="resize-none border-2"
                            maxLength={500}
                          />
                          <p className="text-xs text-muted-foreground text-right">
                            {reportDescription.length}/500 caracteres
                          </p>
                        </div>

                        {/* Info sobre privacidade */}
                        <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Shield className="w-4 h-4 mt-0.5 text-primary" />
                            <p>
                              Sua denúncia é <strong>confidencial</strong> e será analisada por nossa equipe em até 24 horas. Você receberá uma notificação sobre o resultado.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <Button
                            variant="outline"
                            className="flex-1 border-2"
                            onClick={() => {
                              setReportDialogOpen(false);
                              setReportReason('');
                              setReportDescription('');
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-md"
                            onClick={handleReport}
                            disabled={!reportReason}
                          >
                            <Flag className="w-4 h-4 mr-2" />
                            Enviar Denúncia
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
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
