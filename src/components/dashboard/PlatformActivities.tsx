import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatShortName } from '@/lib/utils';

interface PlatformActivity {
  id: string;
  activity_type: string;
  profile_id: string;
  profile_name: string;
  profile_avatar: string | null;
  target_profile_id: string | null;
  target_profile_name: string | null;
  metadata: any;
  created_at: string;
}

export function PlatformActivities() {
  const [activities, setActivities] = useState<PlatformActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemId, setNewItemId] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();

    // Realtime subscription
    const channel = supabase
      .channel('platform-activities')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'platform_activities',
        },
        (payload) => {
          const newActivity = payload.new as PlatformActivity;
          setNewItemId(newActivity.id);
          
          setActivities((prev) => {
            // Adicionar no topo e manter apenas 10
            const updated = [newActivity, ...prev];
            return updated.slice(0, 10);
          });

          // Remover highlight após animação
          setTimeout(() => setNewItemId(null), 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityText = (activity: PlatformActivity) => {
    const shortName = formatShortName(activity.profile_name);
    
    switch (activity.activity_type) {
      case 'project_published':
        return (
          <>
            {shortName} publicou o projeto {activity.metadata.project_title}
          </>
        );
      case 'story_published':
        return (
          <>
            {shortName} publicou um storie
          </>
        );
      case 'profile_followed':
        return (
          <>
            {shortName} seguiu {formatShortName(activity.target_profile_name || '')}
          </>
        );
      case 'proposal_sent':
        return (
          <>
            {shortName} enviou uma proposta de R${' '}
            {Number(activity.metadata.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </>
        );
      default:
        return <>{shortName}</>;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffMs = now.getTime() - postTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Agora';
    if (diffMins === 1) return '1 minuto atrás';
    if (diffMins < 60) return `${diffMins} minutos atrás`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hora atrás';
    if (diffHours < 24) return `${diffHours} horas atrás`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 dia atrás';
    return `${diffDays} dias atrás`;
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader className="border-b border-slate-100 p-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Atividades</h3>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Nenhuma atividade recente</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="space-y-3 pr-4">
              {activities.map((activity, index) => {
                const isNew = activity.id === newItemId;
                
                return (
                  <div 
                    key={activity.id} 
                    className={`flex items-start gap-3 transition-all duration-300 ${
                      isNew ? 'animate-in slide-in-from-top-2 fade-in duration-500' : ''
                    }`}
                    style={{
                      animationDelay: isNew ? '0ms' : `${index * 50}ms`
                    }}
                  >
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={activity.profile_avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-semibold">
                        {formatShortName(activity.profile_name)?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">
                        {getActivityText(activity)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {getTimeAgo(activity.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
