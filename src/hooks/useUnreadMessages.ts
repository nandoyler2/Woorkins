import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUnreadMessages = (profileId: string) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profileId) return;

    const loadUnreadCount = async () => {
      try {
        // Sum all unread counts for this user from message_unread_counts table
        const { data, error } = await supabase
          .from('message_unread_counts')
          .select('unread_count')
          .eq('user_id', profileId);

        if (error) throw error;

        const total = data?.reduce((sum, item) => sum + (item.unread_count || 0), 0) || 0;
        setUnreadCount(total);
      } catch (error) {
        console.error('Error loading unread count:', error);
        setUnreadCount(0);
      }
    };

    loadUnreadCount();

    // Subscribe to realtime updates on message_unread_counts
    const channel = supabase
      .channel('unread-messages-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_unread_counts',
          filter: `user_id=eq.${profileId}`
        },
        () => loadUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return unreadCount;
};

