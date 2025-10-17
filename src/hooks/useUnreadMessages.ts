import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUnreadMessages = (profileId: string) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profileId) return;

    const loadUnreadCount = async () => {
      try {
        // 1) Fonte primária: tabela agregada (fonte da verdade) + reconciliação
        const { data: aggRows, error } = await supabase
          .from('message_unread_counts')
          .select('conversation_id, conversation_type, unread_count, last_read_at')
          .eq('user_id', profileId);

        if (error) throw error;

        if (aggRows && aggRows.length > 0) {
          // Recalcular contagens reais por conversa e reconciliar divergências
          const perConvCounts = await Promise.all(
            aggRows.map(async (r: any) => {
              if (!r?.conversation_id || !r?.conversation_type) return 0;
              const isNegotiation = r.conversation_type === 'negotiation';
              const table = isNegotiation ? 'negotiation_messages' : 'proposal_messages';
              const idColumn = isNegotiation ? 'negotiation_id' : 'proposal_id';

              let q = supabase
                .from(table as any)
                .select('*', { count: 'exact', head: true })
                .eq(idColumn, r.conversation_id)
                .neq('sender_id', profileId)
                .in('status', ['sent', 'delivered'])
                .eq('moderation_status', 'approved');

              if (isNegotiation) {
                q = (q as any).neq('is_deleted', true);
              }

              if (r.last_read_at) {
                q = (q as any).gt('created_at', r.last_read_at as string);
              } else {
                q = (q as any).is('read_at', null);
              }

              const { count } = (await q) as any;
              return count || 0;
            })
          );

          const computedTotal = perConvCounts.reduce((s, c) => s + c, 0);

          // Preparar updates quando houver divergência
          const updates = aggRows
            .map((r: any, idx: number) => ({ row: r, real: perConvCounts[idx] || 0 }))
            .filter(({ row, real }) => (row.unread_count || 0) !== real)
            .map(({ row, real }) => ({
              user_id: profileId,
              conversation_id: row.conversation_id,
              conversation_type: row.conversation_type,
              unread_count: real,
              last_read_at: real === 0 ? new Date().toISOString() : row.last_read_at,
            }));

          if (updates.length) {
            await supabase
              .from('message_unread_counts')
              .upsert(updates, { onConflict: 'user_id,conversation_id,conversation_type' });
          }

          setUnreadCount(Number.isFinite(computedTotal) && computedTotal > 0 ? computedTotal : 0);
          return;
        }

        // 2) Fallback somente quando ainda não existe linha na agregada
        // Negotiations onde o usuário participa
        const { data: negAsUser } = await supabase
          .from('negotiations')
          .select('id')
          .eq('user_id', profileId);

        const { data: myBusinesses } = await supabase
          .from('business_profiles')
          .select('id')
          .eq('profile_id', profileId);

        const businessIds = (myBusinesses || []).map((b: any) => b.id);
        const { data: negAsBusiness } = businessIds.length
          ? await supabase
              .from('negotiations')
              .select('id')
              .in('business_id', businessIds)
          : ({ data: [] } as any);

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

        // Proposals onde o usuário participa
        const { data: propsAsFreelancer } = await supabase
          .from('proposals')
          .select('id')
          .eq('freelancer_id', profileId);

        const { data: myProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('profile_id', profileId);

        const ownerProjectIds = (myProjects || []).map((p: any) => p.id);
        const { data: propsAsOwner } = ownerProjectIds.length
          ? await supabase
              .from('proposals')
              .select('id')
              .in('project_id', ownerProjectIds)
          : ({ data: [] } as any);

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

        const total = negUnread + propUnread;
        setUnreadCount(Number.isFinite(total) && total > 0 ? total : 0);
      } catch (error) {
        console.error('Error loading unread count:', error);
        setUnreadCount(0);
      }
    };

    loadUnreadCount();

    // Realtime: ouvir apenas a agregada
    const channel = supabase
      .channel('unread-messages-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_unread_counts', filter: `user_id=eq.${profileId}` },
        () => loadUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return unreadCount;
};
