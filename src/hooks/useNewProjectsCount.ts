import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useNewProjectsCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchNewProjectsCount = async () => {
      try {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { count: newCount, error } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('moderation_status', 'approved')
          .gte('created_at', twentyFourHoursAgo.toISOString());

        if (error) throw error;
        setCount(newCount || 0);
      } catch (error) {
        console.error('Error fetching new projects count:', error);
        setCount(0);
      }
    };

    fetchNewProjectsCount();

    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchNewProjectsCount, 5 * 60 * 1000);

    // Subscrever a mudanças em tempo real
    const channel = supabase
      .channel('new_projects_count')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'projects',
        },
        () => {
          fetchNewProjectsCount();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, []);

  return count;
}
