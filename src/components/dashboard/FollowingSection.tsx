import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClickableProfile } from '@/components/ClickableProfile';
import { Users, Bell } from 'lucide-react';

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Seguindo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (following.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Seguindo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Você ainda não está seguindo ninguém
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Seguindo ({following.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {following.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                onClick={() => {
                  if (profile.hasUpdate) {
                    markUpdatesAsRead(profile.id);
                  }
                }}
              >
                <ClickableProfile
                  profileId={profile.id}
                  username={profile.username}
                  fullName={profile.full_name || undefined}
                  avatarUrl={profile.avatar_url}
                  showAvatar
                  showName
                  avatarSize="sm"
                  className="flex-1"
                />
                {profile.hasUpdate && (
                  <Badge variant="secondary" className="gap-1">
                    <Bell className="w-3 h-3" />
                    Nova atualização
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
