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
    // Subscrever a novas stories e mudanças de follow
    const storiesChannel = supabase
      .channel('profile-stories-following')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_stories' as any,
        },
        () => {
          loadFollowing();
        }
      )
      .subscribe();

    const followsChannel = supabase
      .channel('follows-following')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' as any },
        () => loadFollowing()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(storiesChannel);
      supabase.removeChannel(followsChannel);
    };
  }, []);

  const loadFollowing = async () => {
    try {
      console.log('🔍 Carregando seguidos para profileId:', profileId);
      
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

      console.log('📋 Follows data:', followsData);
      console.log('❌ Follows error:', followsError);

      if (followsError) throw followsError;

      // Extrair IDs seguidos
      const followingIds: string[] = (followsData || []).map((f: any) => f.following_id);
      console.log('🧾 Following IDs:', followingIds);

      if (followingIds.length === 0) {
        setFollowing([]);
        setLoading(false);
        return;
      }

      // Buscar perfis dos seguidos (sem depender de FK)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles' as any)
        .select('id, username, full_name, avatar_url, last_seen')
        .in('id', followingIds);

      if (profilesError) throw profilesError;
      console.log('👤 Perfis dos seguidos:', profilesData);

      let userProfiles = (profilesData || []).map((p: any) => ({
        id: p.id,
        username: p.username,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        lastSeen: p.last_seen || null,
        hasStory: false,
        latestStoryTime: null as string | null,
        type: 'user' as const,
      }));

      // Buscar stories ativas (últimas 24h)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: storiesData, error: storiesError } = await supabase
        .from('profile_stories' as any)
        .select('profile_id, created_at')
        .in('profile_id', followingIds)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      if (storiesError) throw storiesError;
      console.log('🎞️ Stories ativas:', storiesData);

      const profilesWithStories = new Map<string, string>();
      (storiesData || []).forEach((story: any) => {
        if (!profilesWithStories.has(story.profile_id)) {
          profilesWithStories.set(story.profile_id, story.created_at);
        }
      });

      userProfiles = userProfiles.map((p) => ({
        ...p,
        hasStory: profilesWithStories.has(p.id),
        latestStoryTime: profilesWithStories.get(p.id) || null,
      }));

      // Ordenar: 1) Com stories (mais recente), 2) Mais ativos (lastSeen)
      userProfiles.sort((a, b) => {
        if (a.hasStory && !b.hasStory) return -1;
        if (!a.hasStory && b.hasStory) return 1;
        if (a.hasStory && b.hasStory) {
          return new Date(b.latestStoryTime!).getTime() - new Date(a.latestStoryTime!).getTime();
        }
        const aLast = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const bLast = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        return bLast - aLast;
      });

      setFollowing(userProfiles);
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

  const displayedProfiles = showAll ? following : following.slice(0, 6);

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
          {following.length > 6 && (
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
        <div className="space-y-1">
          {displayedProfiles.map((profile) => (
            <Link 
              key={profile.id}
              to={`/${profile.username}`}
              className="flex items-center gap-3 py-2 px-2 hover:bg-slate-50 rounded-lg transition-colors group"
            >
              <div className="relative flex-shrink-0">
                <ProfileAvatarWithHover
                  profileId={profile.id}
                  username={profile.username}
                  avatarUrl={profile.avatar_url}
                  size="sm"
                  hoverCardSide="right"
                />
                {profile.hasStory && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate group-hover:text-primary transition-colors">
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
