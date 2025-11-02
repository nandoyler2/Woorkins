import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OptimizedAvatar } from '@/components/ui/optimized-avatar';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Eye, Heart } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  avatar_thumbnail_url: string | null;
}

interface StoryViewsDialogProps {
  storyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function StoryViewsDialog({ storyId, isOpen, onClose }: StoryViewsDialogProps) {
  const [views, setViews] = useState<Profile[]>([]);
  const [likes, setLikes] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar visualizações
        const { data: viewsData, error: viewsError } = await supabase
          .from('story_views')
          .select(`
            viewer_profile_id,
            profiles:viewer_profile_id (
              id,
              username,
              full_name,
              avatar_url,
              avatar_thumbnail_url
            )
          `)
          .eq('story_id', storyId)
          .order('viewed_at', { ascending: false });

        if (viewsError) throw viewsError;

        // Buscar curtidas
        const { data: likesData, error: likesError } = await supabase
          .from('story_likes')
          .select(`
            profile_id,
            profiles:profile_id (
              id,
              username,
              full_name,
              avatar_url,
              avatar_thumbnail_url
            )
          `)
          .eq('story_id', storyId)
          .order('created_at', { ascending: false });

        if (likesError) throw likesError;

        setViews(viewsData?.map(v => v.profiles as unknown as Profile).filter(Boolean) || []);
        setLikes(likesData?.map(l => l.profiles as unknown as Profile).filter(Boolean) || []);
      } catch (error) {
        console.error('Error fetching story stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, storyId]);

  const handleProfileClick = (username: string) => {
    onClose();
    navigate(`/perfil/${username}`);
  };

  const ProfileList = ({ profiles }: { profiles: Profile[] }) => (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {profiles.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum registro ainda</p>
      ) : (
        profiles.map((profile) => (
          <div
            key={profile.id}
            onClick={() => handleProfileClick(profile.username)}
            className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer transition-colors"
          >
            <OptimizedAvatar
              fullUrl={profile.avatar_url}
              thumbnailUrl={profile.avatar_thumbnail_url}
              fallback={profile.full_name?.[0] || profile.username?.[0] || 'U'}
              size="md"
              alt={profile.full_name || profile.username}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Estatísticas do Story</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="views" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="views" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Visualizações ({views.length})
            </TabsTrigger>
            <TabsTrigger value="likes" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Curtidas ({likes.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="views" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ProfileList profiles={views} />
            )}
          </TabsContent>
          
          <TabsContent value="likes" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ProfileList profiles={likes} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
