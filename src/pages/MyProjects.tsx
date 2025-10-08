import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProposalChat } from '@/components/ProposalChat';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  budget_min: number;
  budget_max: number;
  proposals_count: number;
  created_at: string;
}

interface Proposal {
  id: string;
  message: string;
  budget: number;
  delivery_days: number;
  status: string;
  created_at: string;
  project: {
    id: string;
    title: string;
  };
  freelancer: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  business?: {
    company_name: string;
  } | null;
}

const MyProjects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Get current user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profile) {
        setCurrentProfileId(profile.id);

        // Load projects
        const { data: projectsData } = await supabase
          .from('projects')
          .select('*')
          .eq('profile_id', profile.id)
          .order('created_at', { ascending: false });

        setProjects(projectsData || []);

        // Load proposals for these projects
        if (projectsData && projectsData.length > 0) {
          const projectIds = projectsData.map(p => p.id);
          
          const { data: proposalsData } = await supabase
            .from('proposals')
            .select(`
              *,
              project:project_id (id, title),
              freelancer:freelancer_id (id, full_name, avatar_url),
              business:business_id (company_name)
            `)
            .in('project_id', projectIds)
            .order('created_at', { ascending: false });

          setProposals(proposalsData as any || []);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProposalStatus = async (proposalId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('proposals')
        .update({ status })
        .eq('id', proposalId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Proposta ${status === 'accepted' ? 'aceita' : 'recusada'} com sucesso!`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar proposta: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const openChat = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setChatOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Meus Projetos</h1>

        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList>
            <TabsTrigger value="projects">Projetos ({projects.length})</TabsTrigger>
            <TabsTrigger value="proposals">Propostas Recebidas ({proposals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            {projects.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Você ainda não criou nenhum projeto.
                </CardContent>
              </Card>
            ) : (
              projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{project.title}</CardTitle>
                        <CardDescription className="mt-2">{project.description}</CardDescription>
                      </div>
                      <Badge variant={project.status === 'open' ? 'default' : 'secondary'}>
                        {project.status === 'open' ? 'Aberto' : 'Fechado'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        Orçamento: R$ {project.budget_min} - R$ {project.budget_max}
                      </span>
                      <span>{project.proposals_count} propostas</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="proposals" className="space-y-4">
            {proposals.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Você ainda não recebeu propostas.
                </CardContent>
              </Card>
            ) : (
              proposals.map((proposal) => (
                <Card key={proposal.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {proposal.freelancer.full_name}
                          {proposal.business && ` - ${proposal.business.company_name}`}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Projeto: {proposal.project.title}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          proposal.status === 'accepted'
                            ? 'default'
                            : proposal.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {proposal.status === 'accepted'
                          ? 'Aceita'
                          : proposal.status === 'rejected'
                          ? 'Recusada'
                          : 'Pendente'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">{proposal.message}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="space-x-4">
                        <span>Orçamento: R$ {proposal.budget}</span>
                        <span>Prazo: {proposal.delivery_days} dias</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openChat(proposal)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Mensagem
                        </Button>
                        {proposal.status === 'pending' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => updateProposalStatus(proposal.id, 'accepted')}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Aceitar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => updateProposalStatus(proposal.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Recusar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Conversa com {selectedProposal?.freelancer.full_name}
            </DialogTitle>
            <DialogDescription>
              Projeto: {selectedProposal?.project.title}
            </DialogDescription>
          </DialogHeader>
          {selectedProposal && (
            <ProposalChat
              proposalId={selectedProposal.id}
              currentUserId={currentProfileId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyProjects;
