import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSupportUnreadCount = (profileId: string | undefined, isOpen: boolean) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasActiveConversation, setHasActiveConversation] = useState(false);

  useEffect(() => {
    if (!profileId) return;

    const loadUnreadCount = async () => {
      try {
        // Buscar conversa ativa
        const { data: conversation } = await supabase
          .from('support_conversations')
          .select('id, last_agent_message_at')
          .eq('profile_id', profileId)
          .eq('status', 'active')
          .maybeSingle();

        if (!conversation) {
          setUnreadCount(0);
          setHasActiveConversation(false);
          return;
        }

        setHasActiveConversation(true);

        // Contar mensagens não lidas do agente
        const { count } = await supabase
          .from('support_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .eq('sender_type', 'agent')
          .eq('read', false);

        setUnreadCount(count || 0);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };

    loadUnreadCount();

    // Atualizar a cada 5 segundos
    const interval = setInterval(loadUnreadCount, 5000);

    // Realtime updates
    const channel = supabase
      .channel('support_unread_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages'
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  // Marcar como lido quando o chat está aberto
  useEffect(() => {
    if (!profileId || !isOpen || !hasActiveConversation) return;

    const markAsRead = async () => {
      try {
        const { data: conversation } = await supabase
          .from('support_conversations')
          .select('id')
          .eq('profile_id', profileId)
          .eq('status', 'active')
          .maybeSingle();

        if (conversation) {
          await supabase
            .from('support_messages')
            .update({ read: true })
            .eq('conversation_id', conversation.id)
            .eq('sender_type', 'agent')
            .eq('read', false);

          setUnreadCount(0);
        }
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    };

    markAsRead();
  }, [profileId, isOpen, hasActiveConversation]);

  return { unreadCount, hasActiveConversation };
};
