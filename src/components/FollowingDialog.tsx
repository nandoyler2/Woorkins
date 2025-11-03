import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProfileAvatarWithHover } from '@/components/ProfileAvatarWithHover';
import { Users, Search, ArrowUpDown, UserPlus } from 'lucide-react';
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
        <div className="space-y-3 p-4">
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
      );
    }

    if (profiles.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">
            {searchQuery
              ? 'Nenhum perfil encontrado'
              : activeTab === 'following'
              ? 'Você ainda não está seguindo ninguém'
              : 'Você ainda não tem seguidores'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1 p-4">
        {profiles.map((profile) => (
          <Link
            key={profile.id}
            to={`/${profile.username}`}
            onClick={() => onOpenChange(false)}
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
              <p className="text-xs text-slate-500 truncate">@{profile.username}</p>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Conexões</h2>
              <p className="text-sm text-slate-600 font-normal mt-0.5">
                {activeTab === 'following'
                  ? `${following.length} ${following.length === 1 ? 'seguindo' : 'seguindo'}`
                  : `${followers.length} ${followers.length === 1 ? 'seguidor' : 'seguidores'}`}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'following' | 'followers')} className="flex-1 flex flex-col">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="following" className="gap-2">
                <Users className="w-4 h-4" />
                Seguindo ({following.length})
              </TabsTrigger>
              <TabsTrigger value="followers" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Seguidores ({followers.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-6 py-4 space-y-3 border-b">
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
          </div>

          <TabsContent value="following" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-[400px]">
              {renderProfileList(filteredFollowing)}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="followers" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-[400px]">
              {renderProfileList(filteredFollowers)}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
