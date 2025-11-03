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
import { ProposalPaymentDialog } from '@/components/projects/ProposalPaymentDialog';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, CheckCircle, XCircle, CreditCard } from 'lucide-react';
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
  payment_status?: string;
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
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState<string>('');

  useEffect(() => {
    document.title = 'Meus Projetos - Woorkins';
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (profile) {
        setCurrentProfileId(profile.id);

        // Load projects and proposals in parallel
        const [projectsResult, proposalsResult] = await Promise.all([
          supabase
            .from('projects')
            .select('*')
            .eq('profile_id', profile.id)
            .order('created_at', { ascending: false }),
          
          supabase
            .from('proposals')
            .select(`
              *,
              project:project_id!inner (id, title, profile_id),
              freelancer:freelancer_id (id, full_name, avatar_url),
              business:business_id (company_name)
            `)
            .eq('project.profile_id', profile.id)
            .order('created_at', { ascending: false })
        ]);

        setProjects(projectsResult.data || []);
        setLoadingProjects(false);
        
        setProposals(proposalsResult.data as any || []);
        setLoadingProposals(false);
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados: ' + error.message,
        variant: 'destructive',
      });
      setLoadingProjects(false);
      setLoadingProposals(false);
    }
  };

  const initiatePayment = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentDialogOpen(false);
    setSelectedProposal(null);
    
    toast({
      title: 'Pagamento realizado!',
      description: 'O valor está retido em segurança. Confirme a conclusão quando o serviço for entregue.',
    });

    loadData();
  };

  const updateProposalStatus = async (proposalId: string, status: 'accepted' | 'rejected') => {
    if (status === 'accepted') {
      // Find the proposal to pass to payment dialog
      const proposal = proposals.find(p => p.id === proposalId);
      if (proposal) {
        initiatePayment(proposal);
      }
    } else {
      try {
        const { error } = await supabase
          .from('proposals')
          .update({ status })
          .eq('id', proposalId);

        if (error) throw error;

        toast({
          title: 'Proposta recusada',
          description: 'A proposta foi recusada com sucesso.',
        });

        loadData();
      } catch (error: any) {
        toast({
          title: 'Erro',
          description: 'Erro ao atualizar proposta: ' + error.message,
          variant: 'destructive',
        });
      }
    }
  };

  const openChat = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setChatOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-woorkins">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-primary bg-clip-text text-transparent">Meus Projetos</h1>

        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList>
            <TabsTrigger value="projects">Projetos ({projects.length})</TabsTrigger>
            <TabsTrigger value="proposals">Propostas Recebidas ({proposals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            {loadingProjects ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="bg-card/50 backdrop-blur-sm shadow-lg border-2">
                    <CardHeader>
                      <div className="animate-pulse space-y-2">
                        <div className="h-6 bg-muted rounded w-3/4" />
                        <div className="h-4 bg-muted rounded w-full" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="animate-pulse h-4 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <Card className="bg-card/50 backdrop-blur-sm shadow-lg border-2">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Você ainda não criou nenhum projeto.
                </CardContent>
              </Card>
            ) : (
              projects.map((project) => (
                <Card key={project.id} className="bg-card/50 backdrop-blur-sm shadow-lg border-2 hover:shadow-xl transition-all">
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
            {loadingProposals ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="bg-card/50 backdrop-blur-sm shadow-lg border-2">
                    <CardHeader>
                      <div className="animate-pulse space-y-2">
                        <div className="h-6 bg-muted rounded w-1/2" />
                        <div className="h-4 bg-muted rounded w-3/4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-muted rounded w-full" />
                        <div className="h-4 bg-muted rounded w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : proposals.length === 0 ? (
              <Card className="bg-card/50 backdrop-blur-sm shadow-lg border-2">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Você ainda não recebeu propostas.
                </CardContent>
              </Card>
            ) : (
              proposals.map((proposal) => (
                <Card key={proposal.id} className="bg-card/50 backdrop-blur-sm shadow-lg border-2 hover:shadow-xl transition-all">
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
                        {proposal.status === 'accepted' && proposal.payment_status === 'paid_escrow'
                          ? '💰 Retido em Escrow'
                          : proposal.status === 'accepted'
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
                              className="bg-gradient-primary hover:opacity-90"
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Aceitar e Pagar
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
                        {proposal.status === 'accepted' && proposal.payment_status === 'paid_escrow' && (
                          <>
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                              💰 Pagamento Retido
                            </Badge>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase.functions.invoke('release-payment', {
                                    body: { proposal_id: proposal.id }
                                  });
                                  if (error) throw error;
                                  toast({
                                    title: 'Serviço confirmado!',
                                    description: 'O pagamento foi liberado para o freelancer.',
                                  });
                                  loadData();
                                } catch (error: any) {
                                  toast({
                                    title: 'Erro',
                                    description: error.message,
                                    variant: 'destructive',
                                  });
                                }
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Confirmar Serviço Concluído
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

      {selectedProposal && (
        <ProposalPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          proposalId={selectedProposal.id}
          amount={selectedProposal.budget}
          projectTitle={selectedProposal.project.title}
        />
      )}
    </div>
  );
};

export default MyProjects;