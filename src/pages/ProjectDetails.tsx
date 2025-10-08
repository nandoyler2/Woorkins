import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, DollarSign, Calendar, User, MessageSquare, 
  Send, Briefcase, Clock 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface BusinessProfile {
  id: string;
  company_name: string;
  slug: string;
}

export default function ProjectDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [myBusinesses, setMyBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [message, setMessage] = useState('');
  const [budget, setBudget] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState('individual');

  useEffect(() => {
    loadProjectData();
    if (user) {
      loadMyBusinesses();
    }
  }, [id, user]);

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
            user_id
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

  const loadMyBusinesses = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles' as any)
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profileData) return;

    const { data } = await supabase
      .from('business_profiles' as any)
      .select('id, company_name, slug')
      .eq('profile_id', (profileData as any).id);

    if (data) {
      setMyBusinesses(data as any);
    }
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !project) return;

    setSubmitting(true);

    try {
      const { data: profileData } = await supabase
        .from('profiles' as any)
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) throw new Error('Perfil não encontrado');

      const { error } = await supabase
        .from('proposals' as any)
        .insert({
          project_id: project.id,
          freelancer_id: (profileData as any).id,
          business_id: selectedBusiness && selectedBusiness !== 'individual' ? selectedBusiness : null,
          message,
          budget: parseFloat(budget),
          delivery_days: parseInt(deliveryDays),
        });

      if (error) throw error;

      toast({
        title: 'Proposta enviada!',
        description: 'Sua proposta foi enviada com sucesso.',
      });

      setMessage('');
      setBudget('');
      setDeliveryDays('');
      setSelectedBusiness('individual');
      loadProjectData();
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar proposta',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">Projeto não encontrado</h1>
          <Button asChild className="bg-gradient-primary">
            <Link to="/projects">Voltar</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = user && project.profiles.user_id === user.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/projects">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para projetos
            </Link>
          </Button>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-card/50 backdrop-blur-sm border-2">
                <CardHeader>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 flex-wrap">
                      <CardTitle className="text-3xl flex-1">{project.title}</CardTitle>
                      <Badge 
                        variant={project.status === 'open' ? 'default' : 'outline'}
                        className={project.status === 'open' ? 'bg-accent' : ''}
                      >
                        {project.status === 'open' ? 'Aberto' : 'Fechado'}
                      </Badge>
                      {project.category && (
                        <Badge variant="secondary" className="bg-gradient-secondary">
                          {project.category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>
                        Por {project.profiles.full_name} (@{project.profiles.username})
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Descrição</h3>
                    <p className="text-foreground leading-relaxed whitespace-pre-line">
                      {project.description}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Proposals Section */}
              <Card className="bg-card/50 backdrop-blur-sm border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Propostas ({proposals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {proposals.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma proposta ainda. Seja o primeiro!
                    </p>
                  ) : (
                    proposals.map((proposal) => (
                      <div key={proposal.id} className="border-2 rounded-lg p-4 space-y-3 hover:border-primary/50 transition-all">
                        <div className="flex items-start justify-between">
                          <div>
                            {proposal.business_profiles ? (
                              <Link 
                                to={`/${proposal.business_profiles.slug}`}
                                className="font-semibold hover:text-primary transition-colors"
                              >
                                {proposal.business_profiles.company_name}
                              </Link>
                            ) : (
                              <p className="font-semibold">{proposal.profiles.full_name}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              @{proposal.profiles.username}
                            </p>
                          </div>
                          <Badge variant={proposal.status === 'pending' ? 'default' : 'secondary'}>
                            {proposal.status === 'pending' ? 'Pendente' : 
                             proposal.status === 'accepted' ? 'Aceita' : 'Rejeitada'}
                          </Badge>
                        </div>
                        <p className="text-sm">{proposal.message}</p>
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-primary" />
                            <span className="font-medium">R$ {proposal.budget}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-primary" />
                            <span>{proposal.delivery_days} dias</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="bg-card/50 backdrop-blur-sm border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="font-medium">Orçamento:</span>
                    </div>
                    <p className="text-sm pl-6">
                      {!project.budget_min && !project.budget_max ? 'A combinar' : 
                       project.budget_min && project.budget_max ? 
                         `R$ ${project.budget_min} - R$ ${project.budget_max}` :
                       project.budget_min ? `A partir de R$ ${project.budget_min}` :
                       `Até R$ ${project.budget_max}`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-medium">Prazo:</span>
                    </div>
                    <p className="text-sm pl-6">
                      {project.deadline 
                        ? new Date(project.deadline).toLocaleDateString('pt-BR')
                        : 'Sem prazo definido'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="w-4 h-4 text-primary" />
                      <span className="font-medium">Propostas:</span>
                    </div>
                    <p className="text-sm pl-6">{project.proposals_count}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Proposal Form */}
              {!isOwner && user && project.status === 'open' && (
                <Card className="bg-card/50 backdrop-blur-sm border-2">
                  <CardHeader>
                    <CardTitle>Enviar Proposta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmitProposal} className="space-y-4">
                      {myBusinesses.length > 0 && (
                        <div className="space-y-2">
                          <Label>Enviar como (opcional)</Label>
                          <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pessoa física" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="individual">Pessoa física</SelectItem>
                              {myBusinesses.map((business) => (
                                <SelectItem key={business.id} value={business.id}>
                                  {business.company_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="message">Mensagem *</Label>
                        <Textarea
                          id="message"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Descreva sua proposta..."
                          rows={4}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="budget">Valor (R$) *</Label>
                        <Input
                          id="budget"
                          type="number"
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          placeholder="1000"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="delivery">Prazo (dias) *</Label>
                        <Input
                          id="delivery"
                          type="number"
                          value={deliveryDays}
                          onChange={(e) => setDeliveryDays(e.target.value)}
                          placeholder="7"
                          min="1"
                          required
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-primary hover:shadow-glow transition-all" 
                        disabled={submitting}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {submitting ? 'Enviando...' : 'Enviar Proposta'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {!user && project.status === 'open' && (
                <Card className="bg-card/50 backdrop-blur-sm border-2">
                  <CardContent className="pt-6 text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Faça login para enviar uma proposta
                    </p>
                    <Button asChild className="w-full bg-gradient-primary">
                      <Link to="/auth">Fazer Login</Link>
                    </Button>
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