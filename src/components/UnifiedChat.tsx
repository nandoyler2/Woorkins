import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Check, CheckCheck, Paperclip, Smile } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRealtimeMessaging } from '@/hooks/useRealtimeMessaging';

interface UnifiedChatProps {
  conversationId: string;
  conversationType: 'negotiation' | 'proposal';
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  profileId: string;
}

export function UnifiedChat({ conversationId, conversationType, otherUser, profileId }: UnifiedChatProps) {
  const { user } = useAuth();
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    isSending,
    otherUserTyping,
    sendMessage: sendMessageHook,
    handleTyping,
  } = useRealtimeMessaging({
    conversationId,
    conversationType,
    currentUserId: profileId,
    otherUserId: otherUser.id,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || isSending) return;

    await sendMessageHook(messageInput);
    setMessageInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    handleTyping();
  };

  const getMessageStatusIcon = (status?: string) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case 'sending':
        return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
      default:
        return null;
    }
  };

  const isMyMessage = (senderId: string) => senderId === profileId;

  if (isLoading) {
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
            {otherUserTyping ? (
              <span className="text-xs text-primary animate-pulse font-medium">Digitando...</span>
            ) : (
              <>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
                <span className="text-xs text-muted-foreground">•</span>
                <Badge variant="secondary" className="text-xs">
                  {conversationType === 'negotiation' ? 'Negociação' : 'Proposta'}
                </Badge>
              </>
            )}
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
              const isMine = isMyMessage(message.sender_id);
              return (
                <div
                  key={message.id}
                  className={`flex gap-2 animate-in slide-in-from-bottom-2 ${
                    isMine ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {!isMine && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={message.sender_avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {message.sender_name.charAt(0).toUpperCase()}
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
                    <div className={`flex items-center gap-1.5 mt-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {isMine && getMessageStatusIcon(message.status)}
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
      <form onSubmit={handleSendMessage} className="border-t p-4 bg-card/80 backdrop-blur-sm">
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
            value={messageInput}
            onChange={handleInputChange}
            placeholder="Digite sua mensagem..."
            disabled={isSending}
            className="flex-1 bg-background/50"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon"
            className="flex-shrink-0"
          >
            <Smile className="h-5 h-5" />
          </Button>
          <Button 
            type="submit" 
            disabled={isSending || !messageInput.trim()}
            size="icon"
            className="flex-shrink-0"
          >
            {isSending ? (
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