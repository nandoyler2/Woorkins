import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Briefcase, Camera, UserPlus, DollarSign } from 'lucide-react';
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
        return <Briefcase className="w-4 h-4" />;
      case 'story_published':
        return <Camera className="w-4 h-4" />;
      case 'profile_followed':
        return <UserPlus className="w-4 h-4" />;
      case 'proposal_sent':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
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
            <span className="font-semibold">{shortName}</span> publicou o projeto{' '}
            <span className="font-medium">{activity.metadata.project_title}</span>
          </>
        );
      case 'story_published':
        return (
          <>
            <span className="font-semibold">{shortName}</span> publicou um storie
          </>
        );
      case 'profile_followed':
        return (
          <>
            <span className="font-semibold">{shortName}</span> seguiu{' '}
            <span className="font-semibold">{formatShortName(activity.target_profile_name || '')}</span>
          </>
        );
      case 'proposal_sent':
        return (
          <>
            <span className="font-semibold">{shortName}</span> enviou uma proposta de R${' '}
            {Number(activity.metadata.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </>
        );
      default:
        return <span className="font-semibold">{shortName}</span>;
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Atividades
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {activities.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Nenhuma atividade recente
            </div>
          ) : (
            <div className="px-6 pb-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors rounded px-2 -mx-2"
                >
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={activity.profile_avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {activity.profile_name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${getActivityColor(
                        activity.activity_type
                      )} flex items-center justify-center text-white`}
                    >
                      {getActivityIcon(activity.activity_type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                      {getActivityText(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getTimeAgo(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
