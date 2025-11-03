import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, User, Calendar, DollarSign, Tag, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface PendingProject {
  id: string;
  profile_id: string;
  title: string;
  description: string;
  categories: string[];
  skills: string[];
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  moderation_status: string;
  moderation_reason: string | null;
  ai_analysis: any;
  created_at: string;
  profiles: {
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
}

export default function ProjectModeration() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [pendingProjects, setProjects] = useState<PendingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedProject, setSelectedProject] = useState<PendingProject | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [adminProfileId, setAdminProfileId] = useState<string | null>(null);

  useEffect(() => {
    loadAdminProfile();
    loadProjects();
  }, [filter]);

  const loadAdminProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setAdminProfileId(data.id);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_projects')
        .select(`
          *,
          profiles!pending_projects_profile_id_fkey (
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('moderation_status', filter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data as any || []);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os projetos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (project: PendingProject) => {
    if (!adminProfileId) return;
    
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('approve_pending_project', {
        p_pending_project_id: project.id,
        p_admin_profile_id: adminProfileId
      });

      if (error) throw error;

      toast({
        title: '✅ Projeto aprovado',
        description: `Projeto "${project.title}" foi publicado com sucesso!`
      });

      loadProjects();
    } catch (error: any) {
      console.error('Erro ao aprovar projeto:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível aprovar o projeto',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProject || !adminProfileId || !rejectionReason.trim()) return;

    setProcessing(true);
    try {
      const { error } = await supabase.rpc('reject_pending_project', {
        p_pending_project_id: selectedProject.id,
        p_admin_profile_id: adminProfileId,
        p_rejection_reason: rejectionReason
      });

      if (error) throw error;

      toast({
        title: '❌ Projeto rejeitado',
        description: 'O usuário foi notificado sobre a rejeição'
      });

      setShowRejectDialog(false);
      setSelectedProject(null);
      setRejectionReason('');
      loadProjects();
    } catch (error: any) {
      console.error('Erro ao rejeitar projeto:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível rejeitar o projeto',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const getBudgetText = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Não definido';
    if (!max) return `A partir de R$ ${min?.toFixed(2)}`;
    return `R$ ${min?.toFixed(2)} - R$ ${max?.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Moderação de Projetos</h2>
        <p className="text-muted-foreground">
          Revise e aprove projetos que precisam de análise manual
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="pending">
            <Clock className="w-4 h-4 mr-2" />
            Pendentes
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle className="w-4 h-4 mr-2" />
            Aprovados
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <XCircle className="w-4 h-4 mr-2" />
            Rejeitados
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4 mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pendingProjects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum projeto {filter === 'pending' ? 'aguardando análise' : filter === 'approved' ? 'aprovado' : 'rejeitado'}
              </CardContent>
            </Card>
          ) : (
            pendingProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(project.moderation_status)}
                        {project.moderation_reason && (
                          <Badge variant="outline" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {project.moderation_reason}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl">{project.title}</CardTitle>
                      <CardDescription className="mt-2 flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {project.profiles.full_name || project.profiles.username}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(project.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Descrição:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Categorias Detectadas:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {project.categories.map((cat) => (
                          <Badge key={cat} variant="secondary">{cat}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Orçamento:
                      </h4>
                      <p className="text-sm">{getBudgetText(project.budget_min, project.budget_max)}</p>
                    </div>
                  </div>

                  {project.skills && project.skills.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Tags:</h4>
                      <div className="flex flex-wrap gap-2">
                        {project.skills.map((skill) => (
                          <Badge key={skill} variant="outline">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {filter === 'pending' && (
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        onClick={() => handleApprove(project)}
                        disabled={processing}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aprovar e Publicar
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedProject(project);
                          setShowRejectDialog(true);
                        }}
                        disabled={processing}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rejeitar
                      </Button>
                    </div>
                  )}

                  {filter === 'rejected' && project.moderation_reason && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <h4 className="font-semibold text-red-600 mb-2">Motivo da Rejeição:</h4>
                      <p className="text-sm text-red-700 dark:text-red-300">{project.moderation_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Projeto</DialogTitle>
            <DialogDescription>
              Explique o motivo da rejeição. O usuário receberá esta mensagem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Motivo da Rejeição</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Este tipo de serviço não é permitido na plataforma..."
                rows={4}
                className="mt-2"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowRejectDialog(false)}
                variant="outline"
                className="flex-1"
                disabled={processing}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleReject}
                variant="destructive"
                className="flex-1"
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? 'Rejeitando...' : 'Confirmar Rejeição'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
