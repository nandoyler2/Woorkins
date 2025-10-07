import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, DollarSign, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NegotiationChatProps {
  negotiationId: string;
  isBusinessView?: boolean;
}

export function NegotiationChat({ negotiationId, isBusinessView = false }: NegotiationChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [proposalAmount, setProposalAmount] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [negotiation, setNegotiation] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNegotiation();
    fetchMessages();
    subscribeToMessages();
  }, [negotiationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchNegotiation = async () => {
    const { data, error } = await supabase
      .from('negotiations')
      .select('*')
      .eq('id', negotiationId)
      .single();

    if (data) setNegotiation(data);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('negotiation_messages')
      .select('*')
      .eq('negotiation_id', negotiationId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`negotiation:${negotiationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'negotiation_messages',
          filter: `negotiation_id=eq.${negotiationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const { error } = await supabase.from('negotiation_messages').insert({
      negotiation_id: negotiationId,
      sender_id: isBusinessView ? negotiation?.business_id : user?.id,
      sender_type: isBusinessView ? 'business' : 'user',
      message_type: 'text',
      content: newMessage,
    });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem',
        variant: 'destructive',
      });
    } else {
      setNewMessage('');
    }
  };

  const sendProposal = async () => {
    if (!proposalAmount || !proposalDescription) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos da proposta',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(proposalAmount);

    const { error: messageError } = await supabase.from('negotiation_messages').insert({
      negotiation_id: negotiationId,
      sender_id: isBusinessView ? negotiation?.business_id : user?.id,
      sender_type: isBusinessView ? 'business' : 'user',
      message_type: isBusinessView ? 'proposal' : 'counter_proposal',
      content: proposalDescription,
      amount,
    });

    if (!messageError) {
      await supabase
        .from('negotiations')
        .update({ current_amount: amount, service_description: proposalDescription })
        .eq('id', negotiationId);

      setShowProposalForm(false);
      setProposalAmount('');
      setProposalDescription('');
      fetchNegotiation();

      toast({
        title: 'Proposta enviada!',
        description: 'Aguarde a resposta',
      });
    }
  };

  const acceptProposal = async (message: any) => {
    const { error: messageError } = await supabase.from('negotiation_messages').insert({
      negotiation_id: negotiationId,
      sender_id: isBusinessView ? negotiation?.business_id : user?.id,
      sender_type: isBusinessView ? 'business' : 'user',
      message_type: 'acceptance',
      content: 'Proposta aceita!',
    });

    if (!messageError) {
      await supabase
        .from('negotiations')
        .update({
          status: 'accepted',
          final_amount: message.amount,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', negotiationId);

      fetchNegotiation();

      toast({
        title: 'Proposta aceita!',
        description: 'Agora o cliente pode realizar o pagamento',
      });
    }
  };

  const rejectProposal = async () => {
    await supabase.from('negotiation_messages').insert({
      negotiation_id: negotiationId,
      sender_id: isBusinessView ? negotiation?.business_id : user?.id,
      sender_type: isBusinessView ? 'business' : 'user',
      message_type: 'rejection',
      content: 'Proposta recusada',
    });

    toast({
      title: 'Proposta recusada',
      description: 'Você pode enviar uma contraproposta',
    });
  };

  const processPayment = async () => {
    if (!negotiation) return;

    // Simular pagamento
    const { error: txError } = await supabase.from('transactions').insert({
      negotiation_id: negotiationId,
      business_id: negotiation.business_id,
      user_id: negotiation.user_id,
      amount: negotiation.final_amount,
      status: 'pending',
      type: 'payment',
    });

    if (!txError) {
      await supabase
        .from('negotiations')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', negotiationId);

      fetchNegotiation();

      toast({
        title: 'Pagamento realizado!',
        description: 'O valor ficará retido até você confirmar o serviço',
      });
    }
  };

  const confirmService = async () => {
    if (!negotiation) return;

    // Liberar pagamento
    const { error: txError } = await supabase
      .from('transactions')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('negotiation_id', negotiationId);

    if (!txError) {
      await supabase
        .from('negotiations')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', negotiationId);

      fetchNegotiation();

      toast({
        title: 'Serviço confirmado!',
        description: 'O pagamento foi liberado para a empresa',
      });
    }
  };

  const renderMessage = (message: any) => {
    const isSender = isBusinessView
      ? message.sender_type === 'business'
      : message.sender_type === 'user';

    if (message.message_type === 'proposal' || message.message_type === 'counter_proposal') {
      return (
        <Card className={`p-4 mb-4 ${isSender ? 'ml-auto' : 'mr-auto'} max-w-[80%]`}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="font-semibold">
              {message.message_type === 'proposal' ? 'Proposta' : 'Contraproposta'}
            </span>
          </div>
          <p className="text-2xl font-bold text-primary mb-2">
            R$ {message.amount?.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground mb-4">{message.content}</p>
          {!isSender && negotiation?.status === 'open' && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => acceptProposal(message)} className="flex-1">
                <Check className="w-4 h-4 mr-1" />
                Aceitar
              </Button>
              <Button size="sm" variant="outline" onClick={rejectProposal} className="flex-1">
                <X className="w-4 h-4 mr-1" />
                Recusar
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </Card>
      );
    }

    if (message.message_type === 'acceptance') {
      return (
        <Card className="p-4 mb-4 mx-auto max-w-[80%] bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <Check className="w-5 h-5" />
            <span className="font-semibold">{message.content}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </Card>
      );
    }

    return (
      <div className={`mb-4 ${isSender ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block p-3 rounded-lg max-w-[70%] ${
            isSender ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}
        >
          <p>{message.content}</p>
          <p className="text-xs mt-1 opacity-70">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {negotiation?.status === 'accepted' && !isBusinessView && (
          <Card className="p-4 bg-primary/10 border-primary">
            <h3 className="font-semibold mb-2">Proposta Aceita!</h3>
            <p className="text-sm mb-3">Valor final: R$ {negotiation.final_amount?.toFixed(2)}</p>
            <Button onClick={processPayment} className="w-full">
              <DollarSign className="w-4 h-4 mr-2" />
              Pagar Agora
            </Button>
          </Card>
        )}

        {negotiation?.status === 'paid' && !isBusinessView && (
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <h3 className="font-semibold mb-2">Pagamento Realizado</h3>
            <p className="text-sm mb-3">
              O valor está retido. Confirme quando o serviço for concluído.
            </p>
            <Button onClick={confirmService} className="w-full" variant="outline">
              <Check className="w-4 h-4 mr-2" />
              Confirmar Serviço Concluído
            </Button>
          </Card>
        )}

        {messages.map((message) => (
          <div key={message.id}>{renderMessage(message)}</div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {negotiation?.status === 'open' && (
        <div className="border-t p-4 space-y-2">
          {showProposalForm ? (
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Valor R$"
                value={proposalAmount}
                onChange={(e) => setProposalAmount(e.target.value)}
              />
              <Textarea
                placeholder="Descrição do serviço"
                value={proposalDescription}
                onChange={(e) => setProposalDescription(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={sendProposal} className="flex-1">
                  Enviar Proposta
                </Button>
                <Button variant="outline" onClick={() => setShowProposalForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button onClick={sendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowProposalForm(true)}
                className="w-full"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                {isBusinessView ? 'Enviar Proposta' : 'Fazer Contraproposta'}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
