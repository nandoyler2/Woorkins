import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProfileAvatarWithHover } from '@/components/ProfileAvatarWithHover';
import { Users, Bell, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatShortName } from '@/lib/utils';

interface FollowedProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  hasUpdate: boolean;
  type: 'user' | 'business';
  company_name?: string;
  slug?: string;
}

interface FollowingSectionProps {
  profileId: string;
}

export function FollowingSection({ profileId }: FollowingSectionProps) {
  const [following, setFollowing] = useState<FollowedProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollowing();
  }, [profileId]);

  useEffect(() => {
    // Subscrever a atualizações de perfis seguidos
    const channel = supabase
      .channel('profile-updates-following')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_updates' as any,
        },
        (payload) => {
          // Verificar se a atualização é de alguém que seguimos
          const updatedProfileId = (payload.new as any).profile_id;
          setFollowing((prev) =>
            prev.map((f) =>
              f.id === updatedProfileId ? { ...f, hasUpdate: true } : f
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadFollowing = async () => {
    try {
      // Buscar perfis de usuários seguidos
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles:following_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('follower_id', profileId);

      if (followsError) throw followsError;

      const userProfiles: FollowedProfile[] = (followsData || [])
        .filter((f: any) => f.profiles)
        .map((f: any) => ({
          id: f.profiles.id,
          username: f.profiles.username,
          full_name: f.profiles.full_name,
          avatar_url: f.profiles.avatar_url,
          hasUpdate: false,
          type: 'user' as const,
        }));

      // Buscar atualizações não lidas
      const followingIds = userProfiles.map((p) => p.id);
      
      if (followingIds.length > 0) {
        const { data: updatesData } = await supabase
          .from('profile_updates' as any)
          .select('profile_id')
          .in('profile_id', followingIds)
          .not('id', 'in', `(
            SELECT update_id 
            FROM profile_update_reads 
            WHERE profile_id = '${profileId}'
          )`);

        const profilesWithUpdates = new Set(
          (updatesData || []).map((u: any) => u.profile_id)
        );

        // Marcar perfis com atualizações
        const finalProfiles = userProfiles.map((p) => ({
          ...p,
          hasUpdate: profilesWithUpdates.has(p.id),
        }));

        setFollowing(finalProfiles);
      } else {
        setFollowing([]);
      }
    } catch (error) {
      console.error('Error loading following:', error);
    } finally {
      setLoading(false);
    }
  };

  const markUpdatesAsRead = async (followedProfileId: string) => {
    try {
      // Buscar IDs das atualizações não lidas
      const { data: updates } = await supabase
        .from('profile_updates' as any)
        .select('id')
        .eq('profile_id', followedProfileId)
        .not('id', 'in', `(
          SELECT update_id 
          FROM profile_update_reads 
          WHERE profile_id = '${profileId}'
        )`);

      if (updates && updates.length > 0) {
        // Marcar como lidas
        const reads = updates.map((u: any) => ({
          profile_id: profileId,
          update_id: u.id,
        }));

        await supabase.from('profile_update_reads' as any).insert(reads);

        // Atualizar estado local
        setFollowing((prev) =>
          prev.map((f) =>
            f.id === followedProfileId ? { ...f, hasUpdate: false } : f
          )
        );
      }
    } catch (error) {
      console.error('Error marking updates as read:', error);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white shadow-sm border border-slate-200">
        <CardHeader className="border-b border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Seguindo</h3>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (following.length === 0) {
    return (
      <Card className="bg-white shadow-sm border border-slate-200">
        <CardHeader className="border-b border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Seguindo</h3>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-slate-600 text-center py-4">
            Você ainda não está seguindo ninguém
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader className="border-b border-slate-100 p-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Seguindo</h3>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {following.map((profile) => (
              <Link 
                key={profile.id}
                to={`/${profile.username}`}
                onClick={() => {
                  if (profile.hasUpdate) {
                    markUpdatesAsRead(profile.id);
                  }
                }}
              >
                <div className="flex items-center justify-between py-2 hover:bg-slate-50 transition-colors rounded-lg px-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <ProfileAvatarWithHover
                      profileId={profile.id}
                      username={profile.username}
                      avatarUrl={profile.avatar_url}
                      size="sm"
                      onClick={() => {
                        if (profile.hasUpdate) {
                          markUpdatesAsRead(profile.id);
                        }
                      }}
                      hoverCardSide="right"
                    />
                    <span className="text-sm text-slate-700 truncate">
                      {formatShortName(profile.full_name) || `@${profile.username}`}
                    </span>
                  </div>
                  {profile.hasUpdate && (
                    <Badge variant="secondary" className="gap-1 flex-shrink-0 bg-blue-100 text-blue-700 border-0 text-xs">
                      <Bell className="w-3 h-3" />
                      Novo
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
