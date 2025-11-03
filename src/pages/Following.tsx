import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProfileAvatarWithHover } from '@/components/ProfileAvatarWithHover';
import { Users, Search, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatShortName } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface FollowedProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  hasStory: boolean;
  latestStoryTime: string | null;
  lastSeen: string | null;
  type: 'user' | 'business';
}

type SortType = 'alphabetical' | 'active' | 'stories';

export default function Following() {
  const { user } = useAuth();
  const [following, setFollowing] = useState<FollowedProfile[]>([]);
  const [filteredFollowing, setFilteredFollowing] = useState<FollowedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('alphabetical');

  useEffect(() => {
    if (user) {
      loadFollowing();
    }
  }, [user]);

  useEffect(() => {
    // Subscrever a mudanças de follow e stories
    const storiesChannel = supabase
      .channel('following-stories-list')
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
      .channel('following-follows-list')
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

  useEffect(() => {
    filterAndSortFollowing();
  }, [following, searchQuery, sortBy]);

  const loadFollowing = async () => {
    if (!user) return;

    try {
      // Obter todos os perfis do usuário logado
      const { data: myProfiles, error: myProfilesError } = await supabase
        .from('profiles' as any)
        .select('id')
        .eq('user_id', user.id);

      if (myProfilesError) throw myProfilesError;

      const myProfileIds = (myProfiles || []).map((p: any) => p.id);

      if (myProfileIds.length === 0) {
        setFollowing([]);
        setLoading(false);
        return;
      }

      // Buscar os following_id
      const { data: followsData, error: followsError } = await supabase
        .from('follows' as any)
        .select('following_id')
        .in('follower_id', myProfileIds);

      if (followsError) throw followsError;

      const followingIds = Array.from(new Set((followsData || []).map((f: any) => f.following_id)));

      if (followingIds.length === 0) {
        setFollowing([]);
        setLoading(false);
        return;
      }

      // Buscar perfis seguidos
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles' as any)
        .select('id, username, full_name, avatar_url, updated_at')
        .in('id', followingIds);

      if (profilesError) throw profilesError;

      let userProfiles = (profilesData || []).map((p: any) => ({
        id: p.id,
        username: p.username,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        lastSeen: p.updated_at || null,
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

      setFollowing(userProfiles);
    } catch (error) {
      console.error('Error loading following:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortFollowing = () => {
    let filtered = [...following];

    // Filtrar por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (profile) =>
          profile.username?.toLowerCase().includes(query) ||
          profile.full_name?.toLowerCase().includes(query)
      );
    }

    // Ordenar
    switch (sortBy) {
      case 'alphabetical':
        filtered.sort((a, b) => {
          const nameA = (formatShortName(a.full_name) || a.username || '').toLowerCase();
          const nameB = (formatShortName(b.full_name) || b.username || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        break;
      case 'active':
        filtered.sort((a, b) => {
          const aLast = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
          const bLast = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
          return bLast - aLast;
        });
        break;
      case 'stories':
        filtered.sort((a, b) => {
          if (a.hasStory && !b.hasStory) return -1;
          if (!a.hasStory && b.hasStory) return 1;
          if (a.hasStory && b.hasStory) {
            return new Date(b.latestStoryTime!).getTime() - new Date(a.latestStoryTime!).getTime();
          }
          return 0;
        });
        break;
    }

    setFilteredFollowing(filtered);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <Header />
      
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Seguindo</h1>
          </div>
          <p className="text-slate-600">
            {loading ? 'Carregando...' : `${following.length} ${following.length === 1 ? 'perfil' : 'perfis'}`}
          </p>
        </div>

        <Card className="bg-white shadow-sm border border-slate-200">
          <CardHeader className="border-b border-slate-100 p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou usuário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-slate-500" />
              <Select value={sortBy} onValueChange={(value: SortType) => setSortBy(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alphabetical">Ordem alfabética</SelectItem>
                  <SelectItem value="active">Mais ativos</SelectItem>
                  <SelectItem value="stories">Com stories</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFollowing.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">
                  {searchQuery ? 'Nenhum perfil encontrado' : 'Você ainda não está seguindo ninguém'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredFollowing.map((profile) => (
                  <Link
                    key={profile.id}
                    to={`/${profile.username}`}
                    className="flex items-center gap-3 py-3 px-3 hover:bg-slate-50 rounded-lg transition-colors group"
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
                      <p className="text-xs text-slate-500 truncate">
                        @{profile.username}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
