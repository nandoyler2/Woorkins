import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface ProposalChatProps {
  proposalId: string;
  currentUserId: string;
}

export const ProposalChat = ({ proposalId, currentUserId }: ProposalChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadMessages();
    
    // Subscribe to real-time messages
    const channel = supabase
      .channel(`proposal-${proposalId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'proposal_messages',
          filter: `proposal_id=eq.${proposalId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', newMsg.sender_id)
            .single();
          
          setMessages(prev => [...prev, { ...newMsg, sender: profile || undefined }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proposalId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('proposal_messages')
      .select(`
        *,
        sender:sender_id (
          full_name,
          avatar_url
        )
      `)
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as any);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('proposal_messages')
        .insert({
          proposal_id: proposalId,
          sender_id: currentUserId,
          content: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar mensagem: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[500px] border rounded-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.sender_id === currentUserId ? 'flex-row-reverse' : ''
            }`}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.sender?.avatar_url || undefined} />
              <AvatarFallback>
                {message.sender?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div
              className={`flex flex-col gap-1 max-w-[70%] ${
                message.sender_id === currentUserId ? 'items-end' : ''
              }`}
            >
              <div
                className={`rounded-lg px-4 py-2 ${
                  message.sender_id === currentUserId
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite sua mensagem..."
          disabled={loading}
        />
        <Button onClick={sendMessage} disabled={loading || !newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
