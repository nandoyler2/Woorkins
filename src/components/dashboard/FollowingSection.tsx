import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProfileAvatarWithHover } from '@/components/ProfileAvatarWithHover';
import { Users, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatShortName } from '@/lib/utils';

interface FollowedProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  hasStory: boolean;
  latestStoryTime: string | null;
  lastSeen: string | null;
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
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadFollowing();
  }, [profileId]);

  useEffect(() => {
    // Subscrever a novas stories
    const channel = supabase
      .channel('stories-following')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stories' as any,
        },
        () => {
          loadFollowing();
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
            avatar_url,
            last_seen
          )
        `)
        .eq('follower_id', profileId);

      if (followsError) throw followsError;

      const userProfiles = (followsData || [])
        .filter((f: any) => f.profiles)
        .map((f: any) => ({
          id: f.profiles.id,
          username: f.profiles.username,
          full_name: f.profiles.full_name,
          avatar_url: f.profiles.avatar_url,
          lastSeen: f.profiles.last_seen,
          hasStory: false,
          latestStoryTime: null,
          type: 'user' as const,
        }));

      const followingIds = userProfiles.map((p) => p.id);
      
      if (followingIds.length > 0) {
        // Buscar stories ativas (últimas 24h)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: storiesData } = await supabase
          .from('stories' as any)
          .select('profile_id, created_at')
          .in('profile_id', followingIds)
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false });

        // Mapear perfis com stories
        const profilesWithStories = new Map<string, string>();
        (storiesData || []).forEach((story: any) => {
          if (!profilesWithStories.has(story.profile_id)) {
            profilesWithStories.set(story.profile_id, story.created_at);
          }
        });

        // Atualizar perfis com informação de stories
        const finalProfiles = userProfiles.map((p) => ({
          ...p,
          hasStory: profilesWithStories.has(p.id),
          latestStoryTime: profilesWithStories.get(p.id) || null,
        }));

        // Ordenar: 1) Com stories (mais recente primeiro), 2) Mais ativos recentemente
        finalProfiles.sort((a, b) => {
          // Perfis com stories vêm primeiro
          if (a.hasStory && !b.hasStory) return -1;
          if (!a.hasStory && b.hasStory) return 1;
          
          // Se ambos têm stories, ordenar por story mais recente
          if (a.hasStory && b.hasStory) {
            return new Date(b.latestStoryTime!).getTime() - new Date(a.latestStoryTime!).getTime();
          }
          
          // Se nenhum tem story, ordenar por último visto
          const aLastSeen = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
          const bLastSeen = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
          return bLastSeen - aLastSeen;
        });

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

  const displayedProfiles = showAll ? following : following.slice(0, 8);

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader className="border-b border-slate-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Seguindo</h3>
          </div>
          {following.length > 8 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-primary hover:text-primary hover:bg-primary/10 h-8 gap-1"
            >
              {showAll ? 'Ver menos' : 'Ver todos'}
              {!showAll && <ArrowRight className="w-3 h-3" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-4 gap-4">
          {displayedProfiles.map((profile) => (
            <Link 
              key={profile.id}
              to={`/${profile.username}`}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="relative">
                <ProfileAvatarWithHover
                  profileId={profile.id}
                  username={profile.username}
                  avatarUrl={profile.avatar_url}
                  size="lg"
                  hoverCardSide="right"
                />
                {profile.hasStory && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  </div>
                )}
              </div>
              <div className="text-center w-full">
                <p className="text-xs font-medium text-slate-700 truncate group-hover:text-primary transition-colors">
                  {formatShortName(profile.full_name) || profile.username}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
