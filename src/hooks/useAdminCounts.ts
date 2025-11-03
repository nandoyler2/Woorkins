import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminCounts {
  moderation: number;
  support: number;
  documentVerifications: number;
  systemBlocks: number;
  withdrawalRequests: number;
  pendingProjects: number;
}

export const useAdminCounts = () => {
  const [counts, setCounts] = useState<AdminCounts>({
    moderation: 0,
    support: 0,
    documentVerifications: 0,
    systemBlocks: 0,
    withdrawalRequests: 0,
    pendingProjects: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        // Use optimized edge function that fetches all counts in parallel
        const { data, error } = await supabase.functions.invoke('get-admin-counts');

        if (error) {
          console.error('Error loading admin counts:', error);
          return;
        }

        if (data) {
          setCounts(data);
        }
      } catch (error) {
        console.error('Error loading admin counts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCounts();

    // Update counts every 30 seconds
    const interval = setInterval(loadCounts, 30000);

    // Setup realtime for critical counts (support and withdrawals)
    const supportChannel = supabase
      .channel('support_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_conversations',
          filter: 'status=eq.active'
        },
        () => {
          loadCounts();
        }
      )
      .subscribe();

    const withdrawalsChannel = supabase
      .channel('withdrawal_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawal_requests',
          filter: 'status=eq.pending'
        },
        () => {
          loadCounts();
        }
      )
      .subscribe();

    const pendingProjectsChannel = supabase
      .channel('pending_projects_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_projects',
          filter: 'moderation_status=eq.pending'
        },
        () => {
          loadCounts();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(supportChannel);
      supabase.removeChannel(withdrawalsChannel);
      supabase.removeChannel(pendingProjectsChannel);
    };
  }, []);

  return { counts, loading };
};