import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Briefcase, Camera, UserPlus, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
          setActivities((prev) => {
            // Adicionar no topo e manter apenas 10
            const updated = [newActivity, ...prev];
            return updated.slice(0, 10);
          });
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_published':
        return Briefcase;
      case 'story_published':
        return Camera;
      case 'profile_followed':
        return UserPlus;
      case 'proposal_sent':
        return DollarSign;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'project_published':
        return 'bg-blue-500';
      case 'story_published':
        return 'bg-purple-500';
      case 'profile_followed':
        return 'bg-green-500';
      case 'proposal_sent':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
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
    if (diffMins < 60) return `${diffMins}m atrás`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
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
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.activity_type);
                const colorClass = getActivityColor(activity.activity_type);
                
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 ${colorClass} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
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
