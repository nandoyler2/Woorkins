import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SafeImage } from "@/components/ui/safe-image";
import { Sparkles, Video, Image, FileText, Play, Heart, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StoriesViewer } from "./StoriesViewer";
import { CreateStoryDialog } from "./CreateStoryDialog";
import { useAuth } from "@/contexts/AuthContext";

interface PublicStory {
  id: string;
  profile_id: string;
  media_url: string | null;
  thumbnail_url: string | null;
  type: string;
  text_content: string | null;
  created_at: string;
  like_count: number;
  profiles: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface PublicStoriesFeedProps {
  currentProfileId: string;
  userProfiles?: any[];
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
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number>(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const STORIES_PER_PAGE = 20;

  const loadPublicStories = useCallback(async (pageNum: number) => {
    try {
      const from = pageNum * STORIES_PER_PAGE;
      const to = from + STORIES_PER_PAGE - 1;

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
        .range(from, to);

      if (error) throw error;

      const newStories = data || [];
      
      if (pageNum === 0) {
        setStories(newStories);
      } else {
        setStories(prev => [...prev, ...newStories]);
      }

      setHasMore(newStories.length === STORIES_PER_PAGE);
    } catch (error) {
      console.error('Error loading public stories:', error);
    } finally {
      setLoading(false);
    }
  }, [STORIES_PER_PAGE]);

  useEffect(() => {
    loadPublicStories(0);

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
            loadPublicStories(0);
            setPage(0);
          } else if (payload.eventType === 'DELETE') {
            setStories(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPublicStories]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadPublicStories(nextPage);
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loading, hasMore, page, loadPublicStories]);

  const handleStoryClick = (storyIndex: number) => {
    setSelectedStoryIndex(storyIndex);
    setIsViewerOpen(true);
  };

  if (loading && stories.length === 0) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
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
      <div 
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(139, 92, 246, 0.2) transparent'
        }}
      >
        {/* Botão de Criar Story */}
        {userProfiles && userProfiles.length > 0 && (
          <div
            className="relative group cursor-pointer overflow-hidden rounded-xl transition-transform hover:scale-[1.02] flex-shrink-0"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <div className="relative w-[180px] h-[320px] bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex flex-col items-center justify-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-6">
                <Plus className="w-12 h-12 text-white" />
              </div>
              <p className="text-white font-bold text-lg">Publicar Story</p>
            </div>
          </div>
        )}

        {stories.map((story, index) => {
          const isNew = new Date().getTime() - new Date(story.created_at).getTime() < 3600000; // 1 hour
          const displayImage = story.thumbnail_url || story.media_url || '/placeholder.svg';
          const videoSrc = story.type === 'video' && story.media_url ? `${story.media_url}#t=5` : story.media_url;

          return (
            <div
              key={story.id}
              className="relative group cursor-pointer overflow-hidden rounded-xl transition-transform hover:scale-[1.02] flex-shrink-0"
              onClick={() => handleStoryClick(index)}
            >
              <div className="relative w-[180px] h-[320px]">
                {story.type === 'text' ? (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center p-6">
                    <p className="text-white text-center text-lg font-medium break-words">
                      {story.text_content}
                    </p>
                  </div>
                ) : story.type === 'video' && videoSrc ? (
                  <video
                    src={videoSrc}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                    playsInline
                  />
                ) : (
                  <SafeImage
                    src={displayImage}
                    alt="Story"
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* NOVO badge */}
                {isNew && (
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    NOVO
                  </div>
                )}
                
                {/* Media type indicator */}
                <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm rounded-full p-2 shadow-lg">
                  {story.type === 'video' && <Video className="w-4 h-4 text-white" />}
                  {story.type === 'image' && <Image className="w-4 h-4 text-white" />}
                  {story.type === 'text' && <FileText className="w-4 h-4 text-white" />}
                </div>
                
                {/* Play button overlay for videos */}
                {story.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/50 backdrop-blur-sm rounded-full p-4 shadow-xl">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
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
          );
        })}

        {/* Loading more indicator */}
        {hasMore && (
          <div ref={observerTarget} className="flex-shrink-0 w-[180px] h-[320px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          </div>
        )}
      </div>

      {isViewerOpen && stories.length > 0 && (
        <StoriesViewer
          profileId={stories[selectedStoryIndex].profile_id}
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
          }}
          allStories={stories}
          initialStoryIndex={selectedStoryIndex}
          currentProfileId={currentProfileId}
        />
      )}
    </>
  );
};
