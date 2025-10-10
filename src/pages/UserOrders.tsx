import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { NegotiationChat } from '@/components/NegotiationChat';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function UserOrders() {
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [selectedNegotiation, setSelectedNegotiation] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchNegotiations();
    }
  }, [user]);

  const fetchNegotiations = async () => {
    const { data } = await supabase
      .from('negotiations')
      .select('*, business_profiles(company_name, logo_url)')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (data) {
      setNegotiations(data);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: any }> = {
      open: { label: 'Em Negociação', color: 'bg-blue-100 text-blue-800', icon: Clock },
      accepted: { label: 'Aguardando Pagamento', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      paid: { label: 'Pago - Em Execução', color: 'bg-purple-100 text-purple-800', icon: Clock },
      completed: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
      rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: XCircle },
    };
    return statusMap[status] || statusMap.open;
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Meus Pedidos</h1>

      <div className="grid grid-cols-1 gap-6">
        {negotiations.map((negotiation) => {
          const statusInfo = getStatusInfo(negotiation.status);
          const StatusIcon = statusInfo.icon;

          return (
            <Card key={negotiation.id} className="p-6">
              <div className="flex items-start gap-4">
                {negotiation.business_profiles?.logo_url && (
                  <img
                    src={negotiation.business_profiles.logo_url}
                    alt={negotiation.business_profiles.company_name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {negotiation.business_profiles?.company_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(negotiation.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <Badge className={statusInfo.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>

                  {negotiation.service_description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {negotiation.service_description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      {negotiation.final_amount ? (
                        <p className="text-2xl font-bold text-primary">
                          R$ {negotiation.final_amount.toFixed(2)}
                        </p>
                      ) : negotiation.current_amount ? (
                        <p className="text-lg text-muted-foreground">
                          Última proposta: R$ {negotiation.current_amount.toFixed(2)}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aguardando proposta</p>
                      )}
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button onClick={() => setSelectedNegotiation(negotiation.id)}>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Abrir Chat
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>
                            Negociação com {negotiation.business_profiles?.company_name}
                          </DialogTitle>
                        </DialogHeader>
                        {selectedNegotiation && (
                          <NegotiationChat negotiationId={selectedNegotiation} />
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>

                  {negotiation.status === 'paid' && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
                      <p className="text-sm text-yellow-800">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Pagamento retido em escrow. Confirme quando o serviço for concluído.
                      </p>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 ml-4"
                        onClick={async () => {
                          try {
                            const { error } = await supabase.functions.invoke('release-payment', {
                              body: { negotiation_id: negotiation.id }
                            });
                            if (error) throw error;
                            toast({
                              title: 'Serviço confirmado!',
                              description: 'O pagamento foi liberado para a empresa.',
                            });
                            fetchNegotiations();
                          } catch (error: any) {
                            toast({
                              title: 'Erro',
                              description: error.message,
                              variant: 'destructive',
                            });
                          }
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Confirmar Conclusão
                      </Button>
                    </div>
                  )}

                  {negotiation.status === 'completed' && negotiation.completed_at && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                        Serviço concluído em{' '}
                        {formatDistanceToNow(new Date(negotiation.completed_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {negotiations.length === 0 && (
          <Card className="p-12">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum pedido encontrado</h3>
              <p className="text-muted-foreground">
                Comece uma negociação com uma empresa para ver seus pedidos aqui
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
