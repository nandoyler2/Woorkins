import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Check, CheckCheck, Paperclip, Smile } from 'lucide-react';
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
    <div className="h-full flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b p-4 flex items-center gap-3 bg-card/80 backdrop-blur-sm">
        <div className="relative">
          <Avatar className="h-10 w-10 ring-2 ring-background">
            <AvatarImage src={otherUser.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {otherUser.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{otherUser.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
            <span className="text-xs text-muted-foreground">•</span>
            <Badge variant="secondary" className="text-xs">
              {conversationType === 'negotiation' ? 'Negociação' : 'Proposta'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
                <Send className="h-8 w-8 text-primary/50" />
              </div>
              <p className="text-muted-foreground font-medium">Nenhuma mensagem ainda</p>
              <p className="text-sm text-muted-foreground mt-1">Envie a primeira mensagem!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isMine = isMyMessage(message);
              return (
                <div
                  key={message.id}
                  className={`flex gap-2 animate-in slide-in-from-bottom-2 ${
                    isMine ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {!isMine && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={otherUser.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {otherUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`flex flex-col max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                        isMine
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-card border rounded-tl-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed break-words">{message.content}</p>
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {isMine && (
                        <CheckCheck className="h-3 w-3 text-primary" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t p-4 bg-card/80 backdrop-blur-sm">
        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="ghost" 
            size="icon"
            className="flex-shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            disabled={sending}
            className="flex-1 bg-background/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon"
            className="flex-shrink-0"
          >
            <Smile className="h-5 w-5" />
          </Button>
          <Button 
            type="submit" 
            disabled={sending || !newMessage.trim()}
            size="icon"
            className="flex-shrink-0"
          >
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
