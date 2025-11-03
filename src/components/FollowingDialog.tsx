import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProfileAvatarWithHover } from '@/components/ProfileAvatarWithHover';
import { Users, Search, ArrowUpDown, UserPlus, X } from 'lucide-react';
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

interface FollowingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'following' | 'followers';
}

export function FollowingDialog({ open, onOpenChange, initialTab = 'following' }: FollowingDialogProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'following' | 'followers'>(initialTab);
  const [following, setFollowing] = useState<FollowedProfile[]>([]);
  const [followers, setFollowers] = useState<FollowedProfile[]>([]);
  const [filteredFollowing, setFilteredFollowing] = useState<FollowedProfile[]>([]);
  const [filteredFollowers, setFilteredFollowers] = useState<FollowedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('alphabetical');

  useEffect(() => {
    if (open && user) {
      loadFollowing();
      loadFollowers();
    }
  }, [open, user]);

  useEffect(() => {
    if (open) {
      const storiesChannel = supabase
        .channel('following-dialog-stories')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'profile_stories' as any,
          },
          () => {
            loadFollowing();
            loadFollowers();
          }
        )
        .subscribe();

      const followsChannel = supabase
        .channel('following-dialog-follows')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'follows' as any },
          () => {
            loadFollowing();
            loadFollowers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(storiesChannel);
        supabase.removeChannel(followsChannel);
      };
    }
  }, [open]);

  useEffect(() => {
    filterAndSortFollowing();
    filterAndSortFollowers();
  }, [following, followers, searchQuery, sortBy]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadFollowing = async () => {
    if (!user) return;

    try {
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

  const loadFollowers = async () => {
    if (!user) return;

    try {
      const { data: myProfiles, error: myProfilesError } = await supabase
        .from('profiles' as any)
        .select('id')
        .eq('user_id', user.id);

      if (myProfilesError) throw myProfilesError;

      const myProfileIds = (myProfiles || []).map((p: any) => p.id);

      if (myProfileIds.length === 0) {
        setFollowers([]);
        return;
      }

      const { data: followsData, error: followsError } = await supabase
        .from('follows' as any)
        .select('follower_id')
        .in('following_id', myProfileIds);

      if (followsError) throw followsError;

      const followerIds = Array.from(new Set((followsData || []).map((f: any) => f.follower_id)));

      if (followerIds.length === 0) {
        setFollowers([]);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles' as any)
        .select('id, username, full_name, avatar_url, updated_at')
        .in('id', followerIds);

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

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: storiesData, error: storiesError } = await supabase
        .from('profile_stories' as any)
        .select('profile_id, created_at')
        .in('profile_id', followerIds)
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

      setFollowers(userProfiles);
    } catch (error) {
      console.error('Error loading followers:', error);
    }
  };

  const filterAndSortFollowing = () => {
    let filtered = [...following];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (profile) =>
          profile.username?.toLowerCase().includes(query) ||
          profile.full_name?.toLowerCase().includes(query)
      );
    }

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

  const filterAndSortFollowers = () => {
    let filtered = [...followers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (profile) =>
          profile.username?.toLowerCase().includes(query) ||
          profile.full_name?.toLowerCase().includes(query)
      );
    }

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

    setFilteredFollowers(filtered);
  };

  const renderProfileList = (profiles: FollowedProfile[]) => {
    if (loading) {
      return (
        <div className="space-y-3 p-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2 px-3 bg-white rounded-xl border border-slate-100">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (profiles.length === 0) {
      return (
        <div className="text-center py-16 px-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-blue-600" />
          </div>
          <p className="text-slate-600 font-medium">
            {searchQuery
              ? 'Nenhum perfil encontrado'
              : activeTab === 'following'
              ? 'Você ainda não está seguindo ninguém'
              : 'Você ainda não tem seguidores'}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            {!searchQuery && activeTab === 'following' && 'Comece a seguir perfis para vê-los aqui'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1 p-5">
        {profiles.map((profile) => (
          <Link
            key={profile.id}
            to={`/${profile.username}`}
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-3 py-3 px-3 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-200 hover:shadow-sm group"
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
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                {formatShortName(profile.full_name) || profile.username}
              </p>
              <p className="text-xs text-slate-500 truncate">@{profile.username}</p>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden max-h-[85vh] flex flex-col gap-0" hideClose>
        {/* Header com gradiente bonito */}
        <div className="bg-gradient-to-r from-blue-900 via-teal-700 to-blue-900 p-5 border-b shrink-0 relative">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Conexões</h2>
                <p className="text-sm text-blue-100 font-medium mt-0.5">
                  {activeTab === 'following'
                    ? `${following.length} ${following.length === 1 ? 'seguindo' : 'seguindo'}`
                    : `${followers.length} ${followers.length === 1 ? 'seguidor' : 'seguidores'}`}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded-full p-1.5 transition-all"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-white">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'following' | 'followers')} className="flex-1 flex flex-col">
            <div className="px-5 pt-4 shrink-0">
              <TabsList className="grid w-full grid-cols-2 h-11 bg-blue-50 border border-blue-200">
                <TabsTrigger 
                  value="following" 
                  className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-teal-600 data-[state=active]:text-white font-semibold"
                >
                  <Users className="w-4 h-4" />
                  Seguindo ({following.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="followers" 
                  className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-teal-600 data-[state=active]:text-white font-semibold"
                >
                  <UserPlus className="w-4 h-4" />
                  Seguidores ({followers.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="px-5 py-4 space-y-3 shrink-0 border-b bg-white/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                <Input
                  placeholder="Buscar por nome ou usuário..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 border-blue-200 focus:border-blue-600 bg-white transition-all focus-visible:ring-blue-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-blue-600" />
                <Select value={sortBy} onValueChange={(value: SortType) => setSortBy(value)}>
                  <SelectTrigger className="w-full h-10 border-blue-200 focus:border-blue-600 bg-white">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] bg-white" position="popper" sideOffset={5}>
                    <SelectItem value="alphabetical">📝 Ordem alfabética</SelectItem>
                    <SelectItem value="active">🔥 Mais ativos</SelectItem>
                    <SelectItem value="stories">⭐ Com stories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="following" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-[380px]">
                {renderProfileList(filteredFollowing)}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="followers" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-[380px]">
                {renderProfileList(filteredFollowers)}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
