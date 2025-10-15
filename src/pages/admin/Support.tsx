import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, User, Clock, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Conversation {
  id: string;
  profile_id: string;
  status: string;
  reason: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  attachments: any;
  created_at: string;
}

export default function Support() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<'active' | 'pending_human' | 'closed'>('pending_human');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();
  }, [filter]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('support_conversations')
      .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .eq('status', filter)
      .order('updated_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar conversas',
        variant: 'destructive'
      });
      return;
    }

    setConversations(data || []);
  };

  const fetchMessages = async () => {
    if (!selectedConversation) return;

    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', selectedConversation.id)
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar mensagens',
        variant: 'destructive'
      });
      return;
    }

    setMessages(data || []);
  };

  const subscribeToMessages = () => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`support_admin_${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setIsSending(true);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: userId,
          sender_type: 'agent',
          content: newMessage
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar mensagem',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseConversation = async () => {
    if (!selectedConversation) return;

    const { error } = await supabase
      .from('support_conversations')
      .update({ status: 'closed' })
      .eq('id', selectedConversation.id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao fechar conversa',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Conversa fechada',
      description: 'A conversa foi marcada como resolvida'
    });

    setSelectedConversation(null);
    fetchConversations();
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-6">
      {/* Lista de conversas */}
      <div className="w-80 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Suporte</h1>
          <p className="text-sm text-muted-foreground">
            Atenda usuários em tempo real
          </p>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="flex-1">
          <TabsList className="w-full">
            <TabsTrigger value="pending_human" className="flex-1">Aguardando</TabsTrigger>
            <TabsTrigger value="active" className="flex-1">Ativas</TabsTrigger>
            <TabsTrigger value="closed" className="flex-1">Fechadas</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="flex-1 overflow-y-auto mt-4 space-y-2">
            {conversations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  Nenhuma conversa
                </CardContent>
              </Card>
            ) : (
              conversations.map((conv) => (
                <Card
                  key={conv.id}
                  className={`cursor-pointer hover:bg-accent transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm">
                          {conv.profiles?.full_name || 'Usuário'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(conv.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Área de mensagens */}
      <Card className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <CardHeader className="border-b">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {selectedConversation.profiles?.full_name || 'Usuário'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.reason === 'document_verification_help'
                      ? 'Ajuda com verificação de documentos'
                      : 'Suporte geral'}
                  </p>
                </div>
                {selectedConversation.status !== 'closed' && (
                  <Button onClick={handleCloseConversation} variant="outline" size="sm">
                    Fechar Conversa
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.sender_type === 'agent'
                        ? 'bg-primary text-primary-foreground'
                        : msg.sender_type === 'ai'
                        ? 'bg-secondary'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    {msg.sender_type !== 'agent' && (
                      <Badge variant="outline" className="mb-1 text-xs">
                        {msg.sender_type === 'ai' ? 'IA' : 'Usuário'}
                      </Badge>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.attachments && (
                      <div className="text-xs mt-2 opacity-80">
                        📎 Anexos: Documentos
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </CardContent>

            {selectedConversation.status !== 'closed' && (
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isSending}
                  />
                  <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4" />
              <p>Selecione uma conversa para começar</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
