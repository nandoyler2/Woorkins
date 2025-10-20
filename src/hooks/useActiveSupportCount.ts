import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useActiveSupportCount = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const { count: supportCount } = await supabase
          .from('support_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        setCount(supportCount || 0);
      } catch (error) {
        console.error('Error loading support count:', error);
      }
    };

    loadCount();

    // Atualizar contagem a cada 15 segundos
    const interval = setInterval(loadCount, 15000);

    // Realtime updates
    const channel = supabase
      .channel('support_conversations_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_conversations',
          filter: 'status=eq.active'
        },
        () => {
          loadCount();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
};