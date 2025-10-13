import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUnreadMessages = (profileId: string) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profileId) return;

    const loadUnreadCount = async () => {
      try {
        // Get all negotiations where user is involved
        const { data: negotiations } = await supabase
          .from('negotiations')
          .select('id')
          .or(`user_id.eq.${profileId},business_id.in.(select id from business_profiles where profile_id = '${profileId}')`);

        const negotiationIds = negotiations?.map(n => n.id) || [];

        // Count unread negotiation messages
        let negCount = 0;
        if (negotiationIds.length > 0) {
          const { count } = await supabase
            .from('negotiation_messages')
            .select('*', { count: 'exact', head: true })
            .in('negotiation_id', negotiationIds)
            .neq('sender_id', profileId)
            .in('status', ['sent', 'delivered']);
          negCount = count || 0;
        }

        // Get all proposals where user is involved
        const { data: proposals } = await supabase
          .from('proposals')
          .select('id')
          .or(`freelancer_id.eq.${profileId},project_id.in.(select id from projects where profile_id = '${profileId}')`);

        const proposalIds = proposals?.map(p => p.id) || [];

        // Count unread proposal messages
        let propCount = 0;
        if (proposalIds.length > 0) {
          const { count } = await supabase
            .from('proposal_messages')
            .select('*', { count: 'exact', head: true })
            .in('proposal_id', proposalIds)
            .neq('sender_id', profileId)
            .in('status', ['sent', 'delivered']);
          propCount = count || 0;
        }

        setUnreadCount(negCount + propCount);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };

    loadUnreadCount();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'negotiation_messages'
        },
        () => loadUnreadCount()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposal_messages'
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
