import { useState, useEffect } from 'react';
import { StoryIndicator } from './StoryIndicator';
import { StoriesViewer } from './StoriesViewer';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

interface StoriesCarouselProps {
  currentProfile: Profile;
  onCreateStory: () => void;
}

interface ProfileWithStories extends Profile {
  hasStories: boolean;
  latestStoryTime?: string;
}

export function StoriesCarousel({ currentProfile, onCreateStory }: StoriesCarouselProps) {
  const [profilesWithStories, setProfilesWithStories] = useState<ProfileWithStories[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [currentUserHasStories, setCurrentUserHasStories] = useState(false);

  useEffect(() => {
    loadStoriesData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('stories-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_stories',
        },
        () => {
          loadStoriesData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProfile.id]);

  const loadStoriesData = async () => {
    try {
      // Verificar se o usuário atual tem stories
      const { count: userStoriesCount } = await supabase
        .from('profile_stories')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', currentProfile.id)
        .gt('expires_at', new Date().toISOString());

      setCurrentUserHasStories((userStoriesCount || 0) > 0);

      // Buscar perfis que o usuário segue
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentProfile.id);

      if (!followsData || followsData.length === 0) {
        setProfilesWithStories([]);
        return;
      }

      const followingIds = followsData.map((f) => f.following_id);

      // Buscar stories dos perfis seguidos
      const { data: storiesData } = await supabase
        .from('profile_stories')
        .select(`
          profile_id,
          created_at,
          profile:profiles(id, username, full_name, avatar_url)
        `)
        .in('profile_id', followingIds)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (!storiesData) {
        setProfilesWithStories([]);
        return;
      }

      // Agrupar por perfil e pegar o mais recente
      const profilesMap = new Map<string, ProfileWithStories>();
      
      storiesData.forEach((story: any) => {
        if (!story.profile) return;
        
        const profileId = story.profile.id;
        if (!profilesMap.has(profileId)) {
          profilesMap.set(profileId, {
            id: story.profile.id,
            username: story.profile.username,
            full_name: story.profile.full_name,
            avatar_url: story.profile.avatar_url,
            hasStories: true,
            latestStoryTime: story.created_at,
          });
        }
      });

      // Ordenar por story mais recente
      const profiles = Array.from(profilesMap.values()).sort((a, b) => {
        const timeA = new Date(a.latestStoryTime || 0).getTime();
        const timeB = new Date(b.latestStoryTime || 0).getTime();
        return timeB - timeA;
      });

      setProfilesWithStories(profiles);
    } catch (error) {
      console.error('Error loading stories data:', error);
    }
  };

  if (!currentUserHasStories && profilesWithStories.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          {/* Story do usuário atual */}
          <div className="flex flex-col items-center gap-2 min-w-fit">
            <div className="relative">
              <StoryIndicator
                profileId={currentProfile.id}
                avatarUrl={currentProfile.avatar_url}
                username={currentProfile.username}
                size="lg"
                onClick={currentUserHasStories ? () => setSelectedProfileId(currentProfile.id) : currentProfile.avatar_url ? onCreateStory : () => {}}
                className={!currentProfile.avatar_url && !currentUserHasStories ? 'opacity-50 cursor-not-allowed' : ''}
              />
              {!currentUserHasStories && (
                <div 
                  className={`absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 ${!currentProfile.avatar_url ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={(e) => {
                    if (!currentProfile.avatar_url) {
                      e.stopPropagation();
                    } else {
                      onCreateStory();
                    }
                  }}
                  title={!currentProfile.avatar_url ? 'Adicione uma foto de perfil para criar stories' : 'Criar story'}
                >
                  <Plus className="w-4 h-4" />
                </div>
              )}
            </div>
            <span className="text-xs font-medium max-w-[80px] truncate">
              {currentUserHasStories ? 'Seu story' : 'Adicionar'}
            </span>
          </div>

          {/* Stories de quem o usuário segue */}
          {profilesWithStories.map((profile) => (
            <div
              key={profile.id}
              className="flex flex-col items-center gap-2 min-w-fit"
            >
              <StoryIndicator
                profileId={profile.id}
                avatarUrl={profile.avatar_url}
                username={profile.username}
                size="lg"
                onClick={() => setSelectedProfileId(profile.id)}
              />
              <span className="text-xs font-medium max-w-[80px] truncate">
                {profile.full_name || profile.username}
              </span>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Viewer */}
      {selectedProfileId && (
        <StoriesViewer
          profileId={selectedProfileId}
          isOpen={!!selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
          currentProfileId={currentProfile.id}
          onStoryDeleted={loadStoriesData}
        />
      )}
    </div>
  );
}
