import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUnreadMessages = (profileId: string) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profileId) return;

    const loadUnreadCount = async () => {
      try {
        // 1) Primary source: aggregated table
        const { data, error } = await supabase
          .from('message_unread_counts')
          .select('unread_count')
          .eq('user_id', profileId);

        if (error) throw error;

        let total = data?.reduce((sum, item) => sum + (item.unread_count || 0), 0) || 0;

        // 2) Fallback for legacy messages (no aggregated rows yet)
        if (total === 0 && (!data || data.length === 0)) {
          // Negotiations where user is customer
          const { data: negAsUser } = await supabase
            .from('negotiations')
            .select('id')
            .eq('user_id', profileId);
          // Negotiations where user is business
          const { data: myBusinesses } = await supabase
            .from('business_profiles')
            .select('id')
            .eq('profile_id', profileId);
          const businessIds = (myBusinesses || []).map((b: any) => b.id);
          const { data: negAsBusiness } = businessIds.length
            ? await supabase.from('negotiations').select('id').in('business_id', businessIds)
            : { data: [] } as any;
          const negotiationIds = [
            ...((negAsUser || []).map((n: any) => n.id)),
            ...((negAsBusiness || []).map((n: any) => n.id)),
          ];

          let negUnread = 0;
          if (negotiationIds.length) {
            const { count } = await supabase
              .from('negotiation_messages')
              .select('*', { count: 'exact', head: true })
              .in('negotiation_id', negotiationIds)
              .neq('sender_id', profileId)
              .in('status', ['sent', 'delivered'])
              .eq('moderation_status', 'approved')
              .neq('is_deleted', true)
              .is('read_at', null);
            negUnread = count || 0;
          }

          // Proposals where user is freelancer
          const { data: propsAsFreelancer } = await supabase
            .from('proposals')
            .select('id')
            .eq('freelancer_id', profileId);
          // Proposals where user owns the project
          const { data: myProjects } = await supabase
            .from('projects')
            .select('id')
            .eq('profile_id', profileId);
          const ownerProjectIds = (myProjects || []).map((p: any) => p.id);
          const { data: propsAsOwner } = ownerProjectIds.length
            ? await supabase.from('proposals').select('id').in('project_id', ownerProjectIds)
            : { data: [] } as any;
          const proposalIds = [
            ...((propsAsFreelancer || []).map((p: any) => p.id)),
            ...((propsAsOwner || []).map((p: any) => p.id)),
          ];

          let propUnread = 0;
          if (proposalIds.length) {
            const { count } = await supabase
              .from('proposal_messages')
              .select('*', { count: 'exact', head: true })
              .in('proposal_id', proposalIds)
              .neq('sender_id', profileId)
              .in('status', ['sent', 'delivered'])
              .eq('moderation_status', 'approved')
              .is('read_at', null);
            propUnread = count || 0;
          }

          total = negUnread + propUnread;
        }

        // Sanity check vs actual unread from message tables
        if (total > 0) {
          try {
            // Negotiations
            const { data: negAsUser2 } = await supabase
              .from('negotiations')
              .select('id')
              .eq('user_id', profileId);
            const { data: myBusinesses2 } = await supabase
              .from('business_profiles')
              .select('id')
              .eq('profile_id', profileId);
            const businessIds2 = (myBusinesses2 || []).map((b: any) => b.id);
            const { data: negAsBusiness2 } = businessIds2.length
              ? await supabase.from('negotiations').select('id').in('business_id', businessIds2)
              : { data: [] } as any;
            const negotiationIds2 = [
              ...((negAsUser2 || []).map((n: any) => n.id)),
              ...((negAsBusiness2 || []).map((n: any) => n.id)),
            ];

            let negUnread2 = 0;
            if (negotiationIds2.length) {
              const { count: countNeg2 } = await supabase
                .from('negotiation_messages')
                .select('*', { count: 'exact', head: true })
                .in('negotiation_id', negotiationIds2)
                .neq('sender_id', profileId)
                .in('status', ['sent', 'delivered'])
                .eq('moderation_status', 'approved')
                .neq('is_deleted', true)
                .is('read_at', null);
              negUnread2 = countNeg2 || 0;
            }

            // Proposals
            const { data: propsAsFreelancer2 } = await supabase
              .from('proposals')
              .select('id')
              .eq('freelancer_id', profileId);
            const { data: myProjects2 } = await supabase
              .from('projects')
              .select('id')
              .eq('profile_id', profileId);
            const ownerProjectIds2 = (myProjects2 || []).map((p: any) => p.id);
            const { data: propsAsOwner2 } = ownerProjectIds2.length
              ? await supabase.from('proposals').select('id').in('project_id', ownerProjectIds2)
              : { data: [] } as any;
            const proposalIds2 = [
              ...((propsAsFreelancer2 || []).map((p: any) => p.id)),
              ...((propsAsOwner2 || []).map((p: any) => p.id)),
            ];

            let propUnread2 = 0;
            if (proposalIds2.length) {
              const { count: countProp2 } = await supabase
                .from('proposal_messages')
                .select('*', { count: 'exact', head: true })
                .in('proposal_id', proposalIds2)
                .neq('sender_id', profileId)
                .in('status', ['sent', 'delivered'])
                .eq('moderation_status', 'approved')
                .is('read_at', null);
              propUnread2 = countProp2 || 0;
            }

            const computed = negUnread2 + propUnread2;
            total = computed;
          } catch {}
        }

        setUnreadCount(total);
      } catch (error) {
        console.error('Error loading unread count:', error);
        setUnreadCount(0);
      }
    };

    loadUnreadCount();

    // Realtime updates
    const channel = supabase
      .channel('unread-messages-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_unread_counts', filter: `user_id=eq.${profileId}` },
        () => loadUnreadCount()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'negotiation_messages' },
        () => loadUnreadCount()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proposal_messages' },
        () => loadUnreadCount()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profileId]);

  return unreadCount;
};

