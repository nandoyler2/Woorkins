import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { compressImage } from '@/lib/imageCompression';
import { useMessageCache } from './useMessageCache';
import { formatShortName } from '@/lib/utils';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
  status?: 'sending' | 'moderating' | 'sent' | 'delivered' | 'read' | 'rejected';
  read_at?: string;
  media_url?: string;
  media_type?: string;
  media_name?: string;
  is_deleted?: boolean;
  moderation_status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
}

interface UseRealtimeMessagingProps {
  conversationId: string;
  conversationType: 'negotiation' | 'proposal';
  currentUserId: string;
  otherUserId: string;
  proposalStatus?: string;
  suppressToasts?: boolean;
}

const MESSAGES_PER_PAGE = 20; // Carregar 20 mensagens por vez

export const useRealtimeMessaging = ({
  conversationId,
  conversationType,
  currentUserId,
  otherUserId,
  proposalStatus,
  suppressToasts = false,
}: UseRealtimeMessagingProps) => {
  const { getMessages, addMessage } = useMessageCache();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const [blockReason, setBlockReason] = useState<string>('');
  const [isConversationActive, setIsConversationActive] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null);
  
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

  // Load messages com paginação - 20 mensagens por vez
  const loadMessages = useCallback(async (initialLoad = true) => {
    try {
      const table = conversationType === 'negotiation' ? 'negotiation_messages' : 'proposal_messages';
      
      // Query base
      let query = (supabase.from(table) as any)
        .select('*')
        .eq(conversationType === 'negotiation' ? 'negotiation_id' : 'proposal_id', conversationId)
        .or(`sender_id.eq.${currentUserId},moderation_status.eq.approved`);
      
      if (initialLoad) {
        // Carga inicial: buscar últimas 20 mensagens
        query = query
          .order('created_at', { ascending: false })
          .limit(MESSAGES_PER_PAGE);
      } else {
        // Carregamento de mensagens antigas
        const oldestMsg = messages.find(m => m.id === oldestMessageId);
        if (oldestMsg) {
          query = query
            .lt('created_at', oldestMsg.created_at)
            .order('created_at', { ascending: false })
            .limit(MESSAGES_PER_PAGE);
        } else {
          return;
        }
      }
      
      const [messagesResult, profilesResult] = await Promise.all([
        query,
        supabase.from('profiles').select('id, full_name, avatar_url')
      ]);
      
      if (messagesResult.error) throw messagesResult.error;
      
      const fetchedMessages = messagesResult.data || [];
      
      // Se retornou menos que o limite, não há mais mensagens
      setHasMoreMessages(fetchedMessages.length === MESSAGES_PER_PAGE);
      
      const profilesMap = new Map(
        (profilesResult.data || []).map(p => [p.id, p])
      );
      
      const messagesWithSenders = fetchedMessages.map((msg: any) => {
        const sender = profilesMap.get(msg.sender_id);
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
          moderation_status: msg.moderation_status,
          rejection_reason: msg.rejection_reason,
        };
      });
      
      // Reverter ordem para cronológica (antiga -> recente)
      const sortedMessages = messagesWithSenders.reverse();
      
      if (initialLoad) {
        setMessages(sortedMessages);
        if (sortedMessages.length > 0) {
          setOldestMessageId(sortedMessages[0].id);
        }
        await markMessagesAsRead();
      } else {
        // Adicionar mensagens antigas no início do array
        setMessages(prev => [...sortedMessages, ...prev]);
        if (sortedMessages.length > 0) {
          setOldestMessageId(sortedMessages[0].id);
        }
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
      if (!suppressToasts) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível carregar as mensagens',
        });
      }
    }
  }, [conversationId, conversationType, currentUserId, messages, oldestMessageId, suppressToasts, toast, markMessagesAsRead]);

  // Função para carregar mais mensagens antigas
  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || isLoadingMore) return;
    
    setIsLoadingMore(true);
    await loadMessages(false);
    setIsLoadingMore(false);
  }, [hasMoreMessages, isLoadingMore, loadMessages]);

  // Send message with optimistic UI and content moderation
  const sendMessage = useCallback(async (content: string, attachment?: { file: File; url: string }) => {
    if ((!content.trim() && !attachment) || isSending) return;

    const tempId = `temp-${Date.now()}`;
    
    // ⚡ INSTANTANEOUS UI UPDATE - Show message IMMEDIATELY (WhatsApp-style)
    const optimisticMessage: Message = {
      id: tempId,
      sender_id: currentUserId,
      sender_name: 'Você',
      content: content.trim(),
      created_at: new Date().toISOString(),
      status: 'sending',
      moderation_status: 'pending',
      media_url: attachment ? URL.createObjectURL(attachment.file) : undefined,
      media_type: attachment?.file.type,
      media_name: attachment?.file.name,
    };

    // Show message immediately for sender
    setMessages(prev => [...prev, optimisticMessage]);
    
    setIsSending(true);

    // Upload attachment variables
    let uploadedMediaUrl: string | undefined;
    let mediaType: string | undefined;
    let mediaName: string | undefined;

    try {
      // Upload attachment in background if present
      if (attachment) {
        try {
          let fileToUpload: File | Blob = attachment.file;

          // Compress images before upload
          if (attachment.file.type.startsWith('image/')) {
            console.log('Compressing message attachment...');
            fileToUpload = await compressImage(attachment.file, {
              maxWidth: 1920,
              maxHeight: 1920,
              quality: 0.85,
              maxSizeMB: 2
            });
          }

          const fileExt = attachment.file.name.split('.').pop();
          const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('message-attachments')
            .upload(fileName, fileToUpload, {
              contentType: attachment.file.type.startsWith('image/') ? 'image/jpeg' : attachment.file.type
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('message-attachments')
            .getPublicUrl(fileName);

          uploadedMediaUrl = publicUrl;
          mediaType = attachment.file.type;
          mediaName = attachment.file.name;
          
          // Update optimistic message with real URL
          setMessages(prev => prev.map(msg => 
            msg.id === tempId ? { ...msg, media_url: uploadedMediaUrl } : msg
          ));
        } catch (uploadError) {
          console.error('Error uploading attachment:', uploadError);
          
          let errorDescription = 'Não foi possível fazer upload do arquivo. ';
          if (uploadError instanceof Error) {
            if (uploadError.message.includes('size')) {
              errorDescription += 'O arquivo excede o limite de 49MB.';
            } else {
              errorDescription += uploadError.message;
            }
          }
          
          if (!suppressToasts) {
            toast({
              variant: 'destructive',
              title: 'Erro ao enviar anexo',
              description: errorDescription,
            });
          }
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
          setIsSending(false);
          return;
        }
      }

      const table = conversationType === 'negotiation' ? 'negotiation_messages' : 'proposal_messages';
      
      // Build insert data based on conversation type
      const insertData: any = {
        sender_id: currentUserId,
        content: content.trim(),
        status: 'sent',
        moderation_status: 'pending', // Start with pending, will be moderated async
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
              status: 'moderating',
              moderation_status: 'pending',
              media_url: data.media_url,
              media_type: data.media_type,
              media_name: data.media_name,
            }
          : msg
      ));

      // Call moderation in background (no await)
      console.log('🚀 Iniciando moderação assíncrona:', data.id);
      supabase.functions.invoke('process-message-moderation', {
        body: {
          messageId: data.id,
          conversationType
        }
      }).then(result => {
        if (result.error) {
          console.error('Erro na moderação assíncrona:', result.error);
        } else {
          console.log('✅ Moderação concluída:', result.data);
          
          // Show warning toast if flagged
          if (result.data?.flagged && !suppressToasts) {
            toast({
              variant: 'destructive',
              title: '⚠️ Aviso de Conduta',
              description: 'Detectamos um padrão suspeito em suas mensagens. Por favor, mantenha a comunicação dentro da plataforma.',
              duration: 8000,
            });
          }
        }
      });

      // Stop typing indicator
      await updateTypingIndicator(false);
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      if (!suppressToasts) {
        toast({
          variant: 'destructive',
          title: 'Erro ao enviar mensagem',
          description: 'Tente novamente',
        });
      }
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
    // Don't show notification OR toast if suppressToasts is enabled OR if user is actively in this conversation and window is focused
    if (suppressToasts || (isConversationActive && !document.hidden)) {
      console.log('Notification suppressed - suppressToasts or user is active in conversation');
      return;
    }
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Nova mensagem', {
        body: `${formatShortName(message.sender_name)}: ${message.content}`,
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
            moderation_status: newMessage.moderation_status,
            rejection_reason: newMessage.rejection_reason,
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
      // Subscribe to message updates (read receipts and moderation status)
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
          
          // Handle moderation status changes
          if (updated.moderation_status === 'rejected') {
            console.log('❌ Mensagem rejeitada:', updated.id);
            setMessages(prev => prev.map(msg =>
              msg.id === updated.id
                ? { 
                    ...msg, 
                    status: 'rejected', 
                    moderation_status: 'rejected',
                    rejection_reason: updated.rejection_reason 
                  }
                : msg
            ));
            
            // Show rejection notification to sender
            if (updated.sender_id === currentUserId && !suppressToasts) {
              toast({
                variant: 'destructive',
                title: '❌ Mensagem não entregue',
                description: updated.rejection_reason || 'Violação das regras da plataforma',
                duration: 10000,
              });
            }
          } else if (updated.moderation_status === 'approved') {
            console.log('✅ Mensagem aprovada:', updated.id);
            setMessages(prev => prev.map(msg =>
              msg.id === updated.id
                ? { 
                    ...msg, 
                    status: 'sent', 
                    moderation_status: 'approved',
                    read_at: updated.read_at 
                  }
                : msg
            ));
          } else {
            // Regular update (read receipts, etc)
            setMessages(prev => prev.map(msg =>
              msg.id === updated.id
                ? { ...msg, status: updated.status, read_at: updated.read_at }
                : msg
            ));
          }
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
    isLoading: false,
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
    isConversationActive,
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
  };
};