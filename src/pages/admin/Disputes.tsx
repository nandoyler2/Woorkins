import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, MessageSquare, CheckCircle, XCircle, Loader2, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Dispute {
  id: string;
  proposal_id?: string;
  negotiation_id?: string;
  opened_by: string;
  against_profile_id: string;
  reason: string;
  description: string;
  status: string;
  admin_notes?: string;
  resolved_by?: string;
  resolution?: string;
  refund_amount?: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  opener: {
    full_name: string;
    avatar_url?: string;
  };
  against: {
    full_name: string;
    avatar_url?: string;
  };
  proposal?: {
    project: {
      title: string;
    };
    budget: number;
  };
}

export default function Disputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolution, setResolution] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadDisputes();
  }, [statusFilter]);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('project_disputes')
        .select(`
          *,
          opener:profiles!project_disputes_opened_by_fkey(full_name, avatar_url),
          against:profiles!project_disputes_against_profile_id_fkey(full_name, avatar_url),
          proposal:proposals(
            budget,
            project:projects(title)
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDisputes(data || []);
    } catch (error) {
      console.error('Error loading disputes:', error);
      toast({
        title: 'Erro ao carregar disputas',
        description: 'Não foi possível carregar as disputas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async (favorOf: 'opener' | 'against') => {
    if (!selectedDispute || !resolution.trim()) {
      toast({
        title: 'Preencha todos os campos',
        description: 'A resolução é obrigatória',
        variant: 'destructive',
      });
      return;
    }

    try {
      setResolving(true);

      const { error } = await supabase
        .from('project_disputes')
        .update({
          status: 'resolved',
          resolution: favorOf,
          admin_notes: adminNotes,
          refund_amount: refundAmount ? parseFloat(refundAmount) : null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', selectedDispute.id);

      if (error) throw error;

      // If refund is needed, update proposal
      if (favorOf === 'opener' && selectedDispute.proposal_id) {
        await supabase
          .from('proposals')
          .update({
            work_status: 'disputed_resolved',
            payment_status: 'refunded',
          })
          .eq('id', selectedDispute.proposal_id);
      }

      toast({
        title: 'Disputa resolvida',
        description: 'A decisão foi registrada com sucesso',
      });

      setShowResolveDialog(false);
      setSelectedDispute(null);
      setResolution('');
      setRefundAmount('');
      setAdminNotes('');
      loadDisputes();
    } catch (error: any) {
      console.error('Error resolving dispute:', error);
      toast({
        title: 'Erro ao resolver disputa',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setResolving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">Aberto</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500">Resolvido</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredDisputes = disputes.filter((dispute) =>
    dispute.opener.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dispute.against.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dispute.proposal?.project?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            Gestão de Disputas
          </h1>
          <p className="text-muted-foreground mt-1">
            Resolução de conflitos entre freelancers e clientes
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou projeto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-48">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Abertos</SelectItem>
                  <SelectItem value="resolved">Resolvidos</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-4">Carregando disputas...</p>
        </div>
      ) : filteredDisputes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all' 
                ? 'Nenhuma disputa encontrada com os filtros aplicados' 
                : 'Nenhuma disputa registrada'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredDisputes.map((dispute) => (
            <Card key={dispute.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">
                        {dispute.proposal?.project?.title || 'Negociação'}
                      </h3>
                      {getStatusBadge(dispute.status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <strong>Aberto por:</strong> {dispute.opener.full_name}
                      </p>
                      <p>
                        <strong>Contra:</strong> {dispute.against.full_name}
                      </p>
                      <p>
                        <strong>Motivo:</strong> {dispute.reason}
                      </p>
                      <p>
                        <strong>Data:</strong>{' '}
                        {format(new Date(dispute.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                      {dispute.proposal && (
                        <p>
                          <strong>Valor:</strong> R${' '}
                          {dispute.proposal.budget.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {dispute.proposal_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/mensagens?type=proposal&id=${dispute.proposal_id}`)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Ver Conversa
                      </Button>
                    )}
                    {dispute.status === 'open' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setShowResolveDialog(true);
                        }}
                      >
                        Resolver Disputa
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm font-medium mb-1">Descrição:</p>
                  <p className="text-sm text-muted-foreground">{dispute.description}</p>
                </div>

                {dispute.status === 'resolved' && (
                  <div className="mt-4 bg-green-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-green-700 mb-1">
                      Resolução: {dispute.resolution === 'opener' ? 'A favor de quem abriu' : 'A favor do acusado'}
                    </p>
                    {dispute.admin_notes && (
                      <p className="text-sm text-green-600">{dispute.admin_notes}</p>
                    )}
                    {dispute.refund_amount && (
                      <p className="text-sm text-green-600 mt-1">
                        Reembolso: R$ {dispute.refund_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolver Disputa</DialogTitle>
            <DialogDescription>
              Analise os detalhes e tome uma decisão sobre esta disputa
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm">
                  <strong>Aberto por:</strong> {selectedDispute.opener.full_name}
                </p>
                <p className="text-sm">
                  <strong>Contra:</strong> {selectedDispute.against.full_name}
                </p>
                <p className="text-sm">
                  <strong>Projeto:</strong> {selectedDispute.proposal?.project?.title}
                </p>
                <p className="text-sm">
                  <strong>Descrição:</strong> {selectedDispute.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Notas Administrativas</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Explique a decisão tomada..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Valor do Reembolso (opcional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleResolveDispute('opener')}
                  disabled={resolving}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {resolving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  A Favor de {selectedDispute.opener.full_name}
                </Button>
                <Button
                  onClick={() => handleResolveDispute('against')}
                  disabled={resolving}
                  variant="destructive"
                  className="flex-1"
                >
                  {resolving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  A Favor de {selectedDispute.against.full_name}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
