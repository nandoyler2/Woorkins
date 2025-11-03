import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useNewProjectsCount() {
  const [count, setCount] = useState(0);
  const [recentCount, setRecentCount] = useState(0);

  useEffect(() => {
    const fetchNewProjectsCount = async () => {
      try {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

        // Contar projetos das últimas 24h
        const { count: newCount, error: error24h } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('moderation_status', 'approved')
          .gte('created_at', twentyFourHoursAgo.toISOString());

        if (error24h) throw error24h;
        setCount(newCount || 0);

        // Contar projetos dos últimos 5 minutos
        const { count: recent, error: error5min } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('moderation_status', 'approved')
          .gte('created_at', fiveMinutesAgo.toISOString());

        if (error5min) throw error5min;
        setRecentCount(recent || 0);
      } catch (error) {
        console.error('Error fetching new projects count:', error);
        setCount(0);
        setRecentCount(0);
      }
    };

    fetchNewProjectsCount();

    // Atualizar a cada minuto para verificar projetos recentes
    const interval = setInterval(fetchNewProjectsCount, 60 * 1000);

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

  return { count, hasRecent: recentCount > 0 };
}
