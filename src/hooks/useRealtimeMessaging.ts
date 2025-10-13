import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  read_at?: string;
}

interface UseRealtimeMessagingProps {
  conversationId: string;
  conversationType: 'negotiation' | 'proposal';
  currentUserId: string;
  otherUserId: string;
}

export const useRealtimeMessaging = ({
  conversationId,
  conversationType,
  currentUserId,
  otherUserId,
}: UseRealtimeMessagingProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      const table = conversationType === 'negotiation' ? 'negotiation_messages' : 'proposal_messages';
      const { data, error } = await (supabase.from(table) as any)
        .select('*')
        .eq(conversationType === 'negotiation' ? 'negotiation_id' : 'proposal_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch sender details for all messages
      const messagesWithSenders = await Promise.all((data || []).map(async (msg: any) => {
        const { data: sender } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', msg.sender_id)
          .single();

        return {
          id: msg.id,
          sender_id: msg.sender_id,
          sender_name: sender?.full_name || 'Usuário',
          sender_avatar: sender?.avatar_url,
          content: msg.content,
          created_at: msg.created_at,
          status: msg.status || 'sent',
          read_at: msg.read_at,
        };
      }));

      setMessages(messagesWithSenders);
      
      // Mark messages as read
      await markMessagesAsRead();
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar as mensagens',
      });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, conversationType, currentUserId]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    try {
      const table = conversationType === 'negotiation' ? 'negotiation_messages' : 'proposal_messages';
      
      // Type assertion to avoid infinite type instantiation
      await (supabase.from(table) as any)
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq(conversationType === 'negotiation' ? 'negotiation_id' : 'proposal_id', conversationId)
        .neq('sender_id', currentUserId)
        .is('read_at', null);

      // Update unread count
      await supabase
        .from('message_unread_counts')
        .upsert(
          {
            user_id: currentUserId,
            conversation_id: conversationId,
            conversation_type: conversationType,
            unread_count: 0,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,conversation_id,conversation_type' }
        );

      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [conversationId, conversationType, currentUserId]);

  // Send message with optimistic UI and content moderation
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isSending) return;

    const tempId = `temp-${Date.now()}`;
    setIsSending(true);

    try {
      // Get recent messages from this user for context (last 5 messages)
      const recentUserMessages = messages
        .filter(m => m.sender_id === currentUserId)
        .slice(-5)
        .map(m => m.content);

      // Call moderation function with context
      const { data: moderationResult, error: moderationError } = await supabase.functions.invoke(
        'moderate-message',
        {
          body: { 
            content: content.trim(),
            recentMessages: recentUserMessages 
          }
        }
      );

      console.log('Moderation result:', moderationResult);

      // Check if message was flagged for bad conduct
      if (moderationResult?.flagged) {
        toast({
          variant: 'destructive',
          title: '⚠️ Conversa Sinalizada',
          description: 'Detectamos uma possível tentativa de compartilhar informações de contato. Seu perfil está sendo sinalizado e você pode ser bloqueado por má conduta. Continuando com este comportamento, sua conta será suspensa permanentemente.',
          duration: 10000,
        });
      }

      // Check if message was rejected
      if (moderationResult && !moderationResult.approved) {
        toast({
          variant: 'destructive',
          title: '🚫 Mensagem Bloqueada',
          description: (moderationResult.reason || 'Esta mensagem viola nossa política de uso.') + ' Tentativas repetidas resultarão no bloqueio permanente da sua conta.',
          duration: 8000,
        });
        setIsSending(false);
        return;
      }

      const optimisticMessage: Message = {
        id: tempId,
        sender_id: currentUserId,
        sender_name: 'Você',
        content: content.trim(),
        created_at: new Date().toISOString(),
        status: 'sending',
      };

      // Optimistic UI update
      setMessages(prev => [...prev, optimisticMessage]);

      const table = conversationType === 'negotiation' ? 'negotiation_messages' : 'proposal_messages';
      
      // Build insert data based on conversation type
      const insertData: any = {
        sender_id: currentUserId,
        content: content.trim(),
        status: 'sent',
        moderation_status: 'approved',
      };

      if (conversationType === 'negotiation') {
        insertData.negotiation_id = conversationId;
        insertData.sender_type = 'user';
        insertData.message_type = 'text';
      } else {
        insertData.proposal_id = conversationId;
      }

      const { data, error } = await supabase
        .from(table)
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Fetch sender details
      const { data: senderData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', currentUserId)
        .single();

      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === tempId
          ? {
              id: data.id,
              sender_id: data.sender_id,
              sender_name: senderData?.full_name || 'Você',
              sender_avatar: senderData?.avatar_url,
              content: data.content,
              created_at: data.created_at,
              status: 'sent',
            }
          : msg
      ));

      // Stop typing indicator
      await updateTypingIndicator(false);
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar mensagem',
        description: 'Tente novamente',
      });
    } finally {
      setIsSending(false);
    }
  }, [conversationId, conversationType, currentUserId, isSending, toast]);

  // Update typing indicator
  const updateTypingIndicator = useCallback(async (typing: boolean) => {
    try {
      await supabase
        .from('typing_indicators')
        .upsert({
          user_id: currentUserId,
          conversation_id: conversationId,
          conversation_type: conversationType,
          is_typing: typing,
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error updating typing indicator:', error);
    }
  }, [currentUserId, conversationId, conversationType]);

  // Handle typing with debounce
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      updateTypingIndicator(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingIndicator(false);
    }, 2000);
  }, [isTyping, updateTypingIndicator]);

  // Show browser notification
  const showNotification = useCallback((message: Message) => {
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Nova mensagem', {
        body: `${message.sender_name}: ${message.content}`,
        icon: message.sender_avatar || '/placeholder.svg',
      });
    }
  }, []);

  // Setup realtime subscriptions
  useEffect(() => {
    const table = conversationType === 'negotiation' ? 'negotiation_messages' : 'proposal_messages';
    const channel = supabase.channel(`messages-${conversationId}`);

    // Subscribe to new messages
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: table,
          filter: `${conversationType === 'negotiation' ? 'negotiation_id' : 'proposal_id'}=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Fetch sender details
          const { data: senderData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          const message: Message = {
            id: newMessage.id,
            sender_id: newMessage.sender_id,
            sender_name: senderData?.full_name || 'Usuário',
            sender_avatar: senderData?.avatar_url,
            content: newMessage.content,
            created_at: newMessage.created_at,
            status: newMessage.status || 'sent',
          };

          // Only add if not from current user (to avoid duplicates from optimistic UI)
          if (message.sender_id !== currentUserId) {
            setMessages(prev => {
              // Check if message already exists
              if (prev.some(m => m.id === message.id)) {
                return prev;
              }
              return [...prev, message];
            });

            // Show notification
            showNotification(message);

            // Mark as delivered
            await supabase
              .from(table)
              .update({ status: 'delivered', delivered_at: new Date().toISOString() })
              .eq('id', newMessage.id);

            // Increment unread count
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      // Subscribe to message updates (read receipts)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: table,
          filter: `${conversationType === 'negotiation' ? 'negotiation_id' : 'proposal_id'}=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setMessages(prev => prev.map(msg =>
            msg.id === updated.id
              ? { ...msg, status: updated.status, read_at: updated.read_at }
              : msg
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: table,
          filter: `${conversationType === 'negotiation' ? 'negotiation_id' : 'proposal_id'}=eq.${conversationId}`,
        },
        (payload) => {
          const deleted = payload.old as any;
          setMessages(prev => prev.filter(m => m.id !== deleted.id));
        }
      )
      .subscribe();

    // Subscribe to typing indicators
    const typingChannel = supabase.channel(`typing-${conversationId}`);
    typingChannel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const indicator = payload.new as any;
          if (indicator?.user_id !== currentUserId) {
            setOtherUserTyping(indicator?.is_typing || false);
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
              setOtherUserTyping(false);
            }, 3000);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      typingChannel.unsubscribe();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, conversationType, currentUserId, showNotification]);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Mark messages as read when conversation is visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        markMessagesAsRead();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Mark as read on mount if visible
    if (!document.hidden) {
      markMessagesAsRead();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [markMessagesAsRead]);

  return {
    messages,
    isLoading,
    isSending,
    isTyping,
    otherUserTyping,
    unreadCount,
    sendMessage,
    handleTyping,
    markMessagesAsRead,
  };
};