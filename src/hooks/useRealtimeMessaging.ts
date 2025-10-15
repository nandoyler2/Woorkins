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
  media_url?: string;
  media_type?: string;
  media_name?: string;
  is_deleted?: boolean;
}

interface UseRealtimeMessagingProps {
  conversationId: string;
  conversationType: 'negotiation' | 'proposal';
  currentUserId: string;
  otherUserId: string;
  proposalStatus?: string;
}

export const useRealtimeMessaging = ({
  conversationId,
  conversationType,
  currentUserId,
  otherUserId,
  proposalStatus,
}: UseRealtimeMessagingProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const [blockReason, setBlockReason] = useState<string>('');
  const [isConversationActive, setIsConversationActive] = useState(true); // Track if user is actively in the conversation
  
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate progressive block duration in minutes
  const getBlockDuration = (violationCount: number): number => {
    const durations = [5, 15, 30, 60, 180, 360, 720, 1440]; // minutes: 5min, 15min, 30min, 1h, 3h, 6h, 12h, 24h
    const index = Math.min(violationCount - 1, durations.length - 1);
    return durations[Math.max(0, index)];
  };

  // Check if user is currently blocked
  const checkBlockStatus = useCallback(async () => {
    try {
      const { data: violation, error } = await supabase
        .from('moderation_violations')
        .select('*')
        .eq('profile_id', currentUserId)
        .maybeSingle();

      if (error) throw error;

      if (violation?.blocked_until) {
        const blockedUntilDate = new Date(violation.blocked_until);
        const now = new Date();
        
        if (blockedUntilDate > now) {
          setIsBlocked(true);
          setBlockedUntil(blockedUntilDate);
          setBlockReason('Você foi bloqueado por violar repetidamente as regras da plataforma.');
          return true;
        } else {
          // Block expired, clear it
          await supabase
            .from('moderation_violations')
            .update({ blocked_until: null })
            .eq('profile_id', currentUserId);
          setIsBlocked(false);
          setBlockedUntil(null);
          return false;
        }
      }
      
      setIsBlocked(false);
      setBlockedUntil(null);
      return false;
    } catch (error) {
      console.error('Error checking block status:', error);
      return false;
    }
  }, [currentUserId]);

  // Track violation and apply progressive block
  const trackViolation = useCallback(async (reason: string) => {
    try {
      // Get current violation record
      const { data: currentViolation } = await supabase
        .from('moderation_violations')
        .select('*')
        .eq('profile_id', currentUserId)
        .maybeSingle();

      const newCount = (currentViolation?.violation_count || 0) + 1;
      
      // Apply block after 5 violations
      let blockedUntilDate = null;
      if (newCount >= 5) {
        const blockMinutes = getBlockDuration(newCount - 4); // Start progressive blocking from 5th violation
        blockedUntilDate = new Date(Date.now() + blockMinutes * 60 * 1000);
      }

      // Upsert violation record
      const { error } = await supabase
        .from('moderation_violations')
        .upsert({
          profile_id: currentUserId,
          violation_count: newCount,
          blocked_until: blockedUntilDate?.toISOString() || null,
          last_violation_at: new Date().toISOString(),
        }, {
          onConflict: 'profile_id'
        });

      if (error) throw error;

      if (blockedUntilDate) {
        setIsBlocked(true);
        setBlockedUntil(blockedUntilDate);
        setBlockReason(`Você foi bloqueado por ${getBlockDuration(newCount - 4)} minutos por violar repetidamente as regras da plataforma.`);
      }

      return { newCount, blockedUntil: blockedUntilDate };
    } catch (error) {
      console.error('Error tracking violation:', error);
      return null;
    }
  }, [currentUserId]);

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
          media_url: msg.media_url,
          media_type: msg.media_type,
          media_name: msg.media_name,
          is_deleted: msg.is_deleted || false,
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
  const sendMessage = useCallback(async (content: string, attachment?: { file: File; url: string }) => {
    if ((!content.trim() && !attachment) || isSending) return;

    // Check if user is blocked before sending
    const blocked = await checkBlockStatus();
    if (blocked) {
      toast({
        variant: 'destructive',
        title: '🚫 Você está bloqueado',
        description: blockReason,
        duration: 8000,
      });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    setIsSending(true);

    try {
      // Check if moderation should be applied based on payment status
      let shouldModerate = false;
      
      if (conversationType === 'proposal') {
        // For proposals, check if it's still pending
        shouldModerate = proposalStatus === 'pending';
      } else if (conversationType === 'negotiation') {
        // For negotiations, check if payment has been made
        const { data: negotiation } = await supabase
          .from('negotiations')
          .select('payment_status')
          .eq('id', conversationId)
          .single();
        
        // Only moderate if payment hasn't been made (unpaid or pending)
        shouldModerate = negotiation?.payment_status !== 'paid';
      }

      if (shouldModerate) {
        // Get recent messages from this user for context (last 5 messages)
        const recentUserMessages = messages
          .filter(m => m.sender_id === currentUserId)
          .slice(-5)
          .map(m => m.content);

        // Call moderation function with context (including image if present)
        const moderationBody: any = { 
          content: content.trim(),
          recentMessages: recentUserMessages
        };

        // If there's an attachment and it's an image, include it in moderation
        if (attachment && attachment.file.type.startsWith('image/')) {
          moderationBody.imageUrl = attachment.url;
        }

        const { data: moderationResult, error: moderationError } = await supabase.functions.invoke(
          'moderate-message',
          { body: moderationBody }
        );

        console.log('Moderation result:', moderationResult);

        // Check if message was rejected
        if (moderationResult && !moderationResult.approved) {
          const violationResult = await trackViolation(moderationResult.reason || 'Violação das regras de moderação');
          
          let description = 'Você está tentando enviar uma forma de contato. Informações de contato só poderão ser passadas após o pagamento ser feito dentro do Woorkins.\n\n';
          
          if (violationResult) {
            if (violationResult.newCount < 5) {
              description += `⚠️ Atenção: Esta é sua ${violationResult.newCount}ª violação. Após 5 violações, você será bloqueado temporariamente.`;
            } else if (violationResult.blockedUntil) {
              const blockMinutes = Math.ceil((violationResult.blockedUntil.getTime() - Date.now()) / (1000 * 60));
              description += `🚫 Você foi bloqueado por ${blockMinutes} minutos. Bloqueios aumentam progressivamente com violações repetidas (até 24h).`;
            }
          }

          toast({
            variant: 'destructive',
            title: '🚫 Mensagem Bloqueada',
            description,
            duration: 10000,
          });
          setIsSending(false);
          return;
        }

        // Check if message was flagged for bad conduct (warning only)
        if (moderationResult?.flagged) {
          toast({
            variant: 'destructive',
            title: '⚠️ Aviso de Conduta',
            description: 'Detectamos um padrão suspeito em suas mensagens. Por favor, mantenha a comunicação dentro da plataforma. Violações repetidas resultarão em bloqueio.',
            duration: 8000,
          });
        }
      }

      // Upload attachment if present
      let uploadedMediaUrl: string | undefined;
      let mediaType: string | undefined;
      let mediaName: string | undefined;

      if (attachment) {
        try {
          const fileExt = attachment.file.name.split('.').pop();
          const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('message-attachments')
            .upload(fileName, attachment.file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('message-attachments')
            .getPublicUrl(fileName);

          uploadedMediaUrl = publicUrl;
          mediaType = attachment.file.type;
          mediaName = attachment.file.name;
        } catch (uploadError) {
          console.error('Error uploading attachment:', uploadError);
          
          // More detailed error message
          let errorDescription = 'Não foi possível fazer upload do arquivo. ';
          if (uploadError instanceof Error) {
            if (uploadError.message.includes('size')) {
              errorDescription += 'O arquivo excede o limite de 49MB.';
            } else {
              errorDescription += uploadError.message;
            }
          }
          
          toast({
            variant: 'destructive',
            title: 'Erro ao enviar anexo',
            description: errorDescription,
          });
          setIsSending(false);
          return;
        }
      }

      const optimisticMessage: Message = {
        id: tempId,
        sender_id: currentUserId,
        sender_name: 'Você',
        content: content.trim(),
        created_at: new Date().toISOString(),
        status: 'sending',
        media_url: uploadedMediaUrl,
        media_type: mediaType,
        media_name: mediaName,
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
        media_url: uploadedMediaUrl,
        media_type: mediaType,
        media_name: mediaName,
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
              media_url: data.media_url,
              media_type: data.media_type,
              media_name: data.media_name,
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

  // Show browser notification - only if conversation is not active or document is hidden
  const showNotification = useCallback((message: Message) => {
    // Don't show notification if user is actively in this conversation and window is focused
    if (isConversationActive || !document.hidden) {
      console.log('Notification suppressed - user is active in conversation');
      return;
    }
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Nova mensagem', {
        body: `${message.sender_name}: ${message.content}`,
        icon: message.sender_avatar || '/placeholder.svg',
      });
    }
  }, [isConversationActive]);

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
            media_url: newMessage.media_url,
            media_type: newMessage.media_type,
            media_name: newMessage.media_name,
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

  // Load messages on mount and check block status
  useEffect(() => {
    loadMessages();
    checkBlockStatus();
  }, [loadMessages, checkBlockStatus]);

  // Check block status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      checkBlockStatus();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [checkBlockStatus]);

  // Mark messages as read when conversation is visible and track active state
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsConversationActive(isVisible);
      if (isVisible) {
        markMessagesAsRead();
      }
    };

    const handleFocus = () => {
      setIsConversationActive(true);
      markMessagesAsRead();
    };

    const handleBlur = () => {
      setIsConversationActive(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    // Mark as read on mount if visible
    if (!document.hidden) {
      setIsConversationActive(true);
      markMessagesAsRead();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [markMessagesAsRead]);

  return {
    messages,
    isLoading,
    isSending,
    isTyping,
    otherUserTyping,
    unreadCount,
    isBlocked,
    blockedUntil,
    blockReason,
    sendMessage,
    handleTyping,
    markMessagesAsRead,
  };
};