import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Report {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reporter: {
    username: string;
    full_name: string;
  };
}

export default function Reports() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    try {
      let query = supabase
        .from('reports' as any)
        .select(`
          *,
          reporter:reporter_id (
            username,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data as any);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as denúncias',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('reports' as any)
        .update({
          status,
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Status atualizado com sucesso',
      });

      loadReports();
      setSelectedReport(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error updating report:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'reviewed':
        return <AlertCircle className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      case 'dismissed':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600';
      case 'reviewed':
        return 'bg-blue-500/10 text-blue-600';
      case 'resolved':
        return 'bg-green-500/10 text-green-600';
      case 'dismissed':
        return 'bg-gray-500/10 text-gray-600';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'reviewed':
        return 'Em Análise';
      case 'resolved':
        return 'Resolvido';
      case 'dismissed':
        return 'Descartado';
      default:
        return status;
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'project':
        return 'Projeto';
      case 'post':
        return 'Publicação';
      case 'evaluation':
        return 'Avaliação';
      case 'profile':
        return 'Perfil';
      case 'business':
        return 'Negócio';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Denúncias</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie conteúdos denunciados pela comunidade
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          Todos
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
          size="sm"
        >
          Pendentes
        </Button>
        <Button
          variant={filter === 'reviewed' ? 'default' : 'outline'}
          onClick={() => setFilter('reviewed')}
          size="sm"
        >
          Em Análise
        </Button>
        <Button
          variant={filter === 'resolved' ? 'default' : 'outline'}
          onClick={() => setFilter('resolved')}
          size="sm"
        >
          Resolvidos
        </Button>
        <Button
          variant={filter === 'dismissed' ? 'default' : 'outline'}
          onClick={() => setFilter('dismissed')}
          size="sm"
        >
          Descartados
        </Button>
      </div>

      {/* Reports Grid */}
      {reports.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-xl font-bold mb-2">Nenhuma denúncia encontrada</h3>
              <p className="text-muted-foreground">
                {filter === 'all' 
                  ? 'Não há denúncias no sistema' 
                  : `Não há denúncias com status "${getStatusLabel(filter)}"`}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {getContentTypeLabel(report.content_type)}
                      </CardTitle>
                      <Badge className={getStatusColor(report.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(report.status)}
                          <span>{getStatusLabel(report.status)}</span>
                        </div>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Denunciado por {report.reporter.full_name} (@{report.reporter.username})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-1">Motivo:</p>
                  <p className="text-sm">{report.reason}</p>
                </div>
                
                {report.description && (
                  <div>
                    <p className="text-sm font-semibold mb-1">Descrição:</p>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </div>
                )}

                {report.admin_notes && (
                  <div>
                    <p className="text-sm font-semibold mb-1">Notas do Admin:</p>
                    <p className="text-sm text-muted-foreground">{report.admin_notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedReport(report);
                          setAdminNotes(report.admin_notes || '');
                        }}
                      >
                        Gerenciar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Gerenciar Denúncia</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold mb-2 block">
                            Notas do Administrador
                          </label>
                          <Textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Adicione suas observações sobre esta denúncia..."
                            rows={4}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => updateReportStatus(report.id, 'reviewed')}
                            variant="outline"
                            className="flex-1"
                          >
                            Em Análise
                          </Button>
                          <Button
                            onClick={() => updateReportStatus(report.id, 'resolved')}
                            variant="default"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            Resolver
                          </Button>
                          <Button
                            onClick={() => updateReportStatus(report.id, 'dismissed')}
                            variant="destructive"
                            className="flex-1"
                          >
                            Descartar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
