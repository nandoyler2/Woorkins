import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SafeImage } from "@/components/ui/safe-image";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StoriesViewer } from "./StoriesViewer";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";

interface PublicStory {
  id: string;
  profile_id: string;
  media_url: string | null;
  thumbnail_url: string | null;
  type: string;
  text_content: string | null;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface PublicStoriesFeedProps {
  currentProfileId: string;
}

const getRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const postTime = new Date(timestamp);
  const diffMs = now.getTime() - postTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `há ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
};

export const PublicStoriesFeed: React.FC<PublicStoriesFeedProps> = ({ currentProfileId }) => {
  const [stories, setStories] = useState<PublicStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const loadPublicStories = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_stories')
        .select(`
          id,
          profile_id,
          media_url,
          thumbnail_url,
          type,
          text_content,
          created_at,
          expires_at,
          profiles!inner(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setStories(data || []);
    } catch (error) {
      console.error('Error loading public stories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPublicStories();

    // Realtime updates
    const channel = supabase
      .channel('public-stories-feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_stories',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            loadPublicStories();
          } else if (payload.eventType === 'DELETE') {
            setStories(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStoryClick = (profileId: string) => {
    setSelectedProfileId(profileId);
    setIsViewerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex-shrink-0">
            <Skeleton className="w-[180px] h-[320px] rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-lg font-medium text-foreground">Nenhum story ativo no momento</p>
        <p className="text-sm text-muted-foreground">Seja o primeiro a compartilhar um momento!</p>
      </div>
    );
  }

  return (
    <>
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {stories.map((story) => {
            const isNew = new Date().getTime() - new Date(story.created_at).getTime() < 3600000; // 1 hour
            const displayImage = story.thumbnail_url || story.media_url || '/placeholder.svg';

            return (
              <CarouselItem key={story.id} className="pl-4 basis-auto">
                <div
                  className="relative group cursor-pointer overflow-hidden rounded-xl transition-transform hover:scale-[1.02]"
                  onClick={() => handleStoryClick(story.profile_id)}
                >
                  <div className="relative w-[180px] h-[320px]">
                    {story.type === 'text' ? (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center p-6">
                        <p className="text-white text-center text-lg font-medium break-words">
                          {story.text_content}
                        </p>
                      </div>
                    ) : (
                      <SafeImage
                        src={displayImage}
                        alt="Story"
                        className="w-full h-full object-cover"
                      />
                    )}
                    
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* NEW badge */}
                    {isNew && (
                      <div className="absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        NEW
                      </div>
                    )}
                    
                    {/* Author info at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8 border-2 border-white shadow-lg">
                          <AvatarImage src={story.profiles.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {(story.profiles.full_name || story.profiles.username)?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate drop-shadow-lg">
                            {story.profiles.full_name || story.profiles.username}
                          </p>
                          <p className="text-xs opacity-90 drop-shadow-lg">
                            {getRelativeTime(story.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        
        <CarouselPrevious className="left-2 bg-background/80 backdrop-blur-sm border-border hover:bg-background" />
        <CarouselNext className="right-2 bg-background/80 backdrop-blur-sm border-border hover:bg-background" />
      </Carousel>

      {selectedProfileId && (
        <StoriesViewer
          profileId={selectedProfileId}
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedProfileId(null);
          }}
        />
      )}
    </>
  );
};
