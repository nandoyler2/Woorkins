import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useNewProjectsCount() {
  const [count, setCount] = useState(0);
  const [hasRecent, setHasRecent] = useState(false);

  useEffect(() => {
    const fetchNewProjectsCount = async () => {
      try {
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

        // Contar projetos da última hora
        const { count: hourCount, error: errorHour } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('moderation_status', 'approved')
          .gte('created_at', oneHourAgo.toISOString());

        if (errorHour) throw errorHour;
        setCount(hourCount || 0);

        // Verificar se tem projetos dos últimos 5 minutos para piscar
        const { count: recentCount, error: errorRecent } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('moderation_status', 'approved')
          .gte('created_at', fiveMinutesAgo.toISOString());

        if (errorRecent) throw errorRecent;
        setHasRecent((recentCount || 0) > 0);
      } catch (error) {
        console.error('Error fetching new projects count:', error);
        setCount(0);
        setHasRecent(false);
      }
    };

    fetchNewProjectsCount();

    // Atualizar a cada minuto
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

  return { count, hasRecent };
}
