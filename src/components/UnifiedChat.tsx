import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_type?: string;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface UnifiedChatProps {
  conversationId: string;
  conversationType: 'negotiation' | 'proposal';
  otherUser: {
    name: string;
    avatar?: string;
  };
  profileId: string;
}

export function UnifiedChat({ conversationId, conversationType, otherUser, profileId }: UnifiedChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    setupRealtimeSubscription();
  }, [conversationId, conversationType]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      if (conversationType === 'negotiation') {
        const { data, error } = await supabase
          .from('negotiation_messages')
          .select('*')
          .eq('negotiation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } else {
        const { data, error } = await supabase
          .from('proposal_messages')
          .select('*')
          .eq('proposal_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Buscar dados dos senders
        const messagesWithSender = await Promise.all(
          (data || []).map(async (msg) => {
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', msg.sender_id)
              .single();
            
            return {
              ...msg,
              sender,
            };
          })
        );

        setMessages(messagesWithSender);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as mensagens',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const tableName = conversationType === 'negotiation' 
      ? 'negotiation_messages' 
      : 'proposal_messages';
    
    const column = conversationType === 'negotiation'
      ? 'negotiation_id'
      : 'proposal_id';

    const channel = supabase
      .channel(`${conversationType}-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
          filter: `${column}=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('Nova mensagem recebida:', payload);
          
          // Se for proposal, buscar dados do sender
          if (conversationType === 'proposal') {
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', payload.new.sender_id)
              .single();

            const messageWithSender = {
              ...(payload.new as Message),
              sender: sender || undefined,
            };

            setMessages((prev) => [...prev, messageWithSender]);
          } else {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      if (conversationType === 'negotiation') {
        // Determinar sender_type
        const { data: negotiation } = await supabase
          .from('negotiations')
          .select('user_id, business_id, business_profiles!inner(profile_id)')
          .eq('id', conversationId)
          .single();

        const isUser = negotiation?.user_id === user?.id;
        const senderType = isUser ? 'user' : 'business';

        const { error } = await supabase
          .from('negotiation_messages')
          .insert({
            negotiation_id: conversationId,
            sender_id: user?.id || '',
            sender_type: senderType,
            content: newMessage.trim(),
            message_type: 'text',
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('proposal_messages')
          .insert({
            proposal_id: conversationId,
            sender_id: profileId,
            content: newMessage.trim(),
          });

        if (error) throw error;
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const isMyMessage = (message: Message) => {
    if (conversationType === 'negotiation') {
      return message.sender_id === user?.id;
    } else {
      return message.sender_id === profileId;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center gap-3">
        <Avatar>
          <AvatarImage src={otherUser.avatar} />
          <AvatarFallback>{otherUser.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{otherUser.name}</h3>
          <p className="text-sm text-muted-foreground">
            {conversationType === 'negotiation' ? 'Negociação' : 'Proposta'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhuma mensagem ainda. Envie a primeira!
            </div>
          ) : (
            messages.map((message) => {
              const isMine = isMyMessage(message);
              return (
                <div
                  key={message.id}
                  className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage 
                      src={isMine ? undefined : otherUser.avatar} 
                    />
                    <AvatarFallback>
                      {isMine 
                        ? 'Você'.charAt(0)
                        : otherUser.name.charAt(0).toUpperCase()
                      }
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[70%] ${
                        isMine
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !newMessage.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
