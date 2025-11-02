import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SafeImage } from "@/components/ui/safe-image";
import { Sparkles, Video, Image, FileText, Play, Heart, Plus, Eye, Zap, Repeat2, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StoriesViewer } from "./StoriesViewer";
import { CreateStoryDialog } from "./CreateStoryDialog";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateUserProfile } from "@/lib/profiles";
import { formatShortName } from "@/lib/utils";
interface PublicStory {
  id: string;
  profile_id: string;
  media_url: string | null;
  thumbnail_url: string | null;
  type: string;
  text_content: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  original_story_id?: string | null;
  original_profile_id?: string | null;
  profiles: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  original_profile?: {
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

const getFirstName = (fullName: string | null, username: string): string => {
  if (!fullName) return username;
  
  const words = fullName.trim().split(' ').filter(w => w.length > 0);
  if (words.length === 0) return username;
  if (words.length === 1) {
    const name = words[0].toLowerCase();
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  
  const prepositions = ['de', 'da', 'do', 'dos', 'das', 'e'];
  const firstName = words[0].toLowerCase();
  const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  
  // Encontrar o primeiro sobrenome que não seja preposição
  for (let i = 1; i < words.length; i++) {
    const word = words[i].toLowerCase();
    if (!prepositions.includes(word)) {
      return `${formattedFirstName} ${word[0].toUpperCase()}.`;
    }
  }
  
  // Se todos os sobrenomes são preposições, retornar só o primeiro nome
  return formattedFirstName;
};

export const PublicStoriesFeed: React.FC<PublicStoriesFeedProps> = ({ currentProfileId, userProfiles = [] }) => {
  const { user } = useAuth();
  const [stories, setStories] = useState<PublicStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number>(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [dialogProfiles, setDialogProfiles] = useState<any[]>(userProfiles || []);

  const STORIES_PER_PAGE = 20;

  // Carrega ou garante perfis para o dialog (quando prop não for passada)
  useEffect(() => {
    const ensureProfiles = async () => {
      try {
        if (userProfiles && userProfiles.length > 0) {
          setDialogProfiles(userProfiles);
          return;
        }
        if (user) {
          const profiles = await getOrCreateUserProfile({ id: user.id, email: user.email || undefined });
          setDialogProfiles(profiles as any[]);
        }
      } catch (err) {
        console.error('Erro ao carregar perfis para postar story:', err);
      }
    };
    ensureProfiles();
  }, [user, userProfiles]);

  const loadPublicStories = useCallback(async (pageNum: number) => {
    try {
      const from = pageNum * STORIES_PER_PAGE;
      const to = from + STORIES_PER_PAGE - 1;

      // Buscar stories com contagem de interações
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
          original_story_id,
          original_profile_id,
          profiles!profile_stories_profile_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          ),
          original_profile:profiles!profile_stories_original_profile_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          ),
          story_likes(count),
          story_comments(count)
        `)
        .gt('expires_at', new Date().toISOString())
        .range(from, to);

      if (error) throw error;

      // Processar stories com score de popularidade
      let processedStories = (data || []).map(story => {
        const likeCount = Array.isArray((story as any).story_likes) ? (story as any).story_likes.length : 0;
        const commentCount = Array.isArray((story as any).story_comments) ? (story as any).story_comments.length : 0;
        const popularityScore = likeCount + (commentCount * 2); // Comentários valem mais
        
        return {
          id: story.id,
          profile_id: story.profile_id,
          media_url: story.media_url,
          thumbnail_url: story.thumbnail_url,
          type: story.type,
          text_content: story.text_content,
          created_at: story.created_at,
          like_count: likeCount,
          comment_count: commentCount,
          original_story_id: story.original_story_id,
          original_profile_id: story.original_profile_id,
          profiles: story.profiles,
          original_profile: story.original_profile,
          popularityScore
        };
      }) as (PublicStory & { popularityScore: number })[];

      // Ordenar por popularidade primeiro
      processedStories.sort((a, b) => {
        // Primeiro por score de popularidade
        if (b.popularityScore !== a.popularityScore) {
          return b.popularityScore - a.popularityScore;
        }
        // Depois por data mais recente
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // Intercalar stories de usuários diferentes quando possível
      const interleavedStories: typeof processedStories = [];
      const remainingStories = [...processedStories];
      let lastProfileId: string | null = null;

      while (remainingStories.length > 0) {
        // Tentar encontrar um story de um usuário diferente do último
        let foundIndex = remainingStories.findIndex(s => s.profile_id !== lastProfileId);
        
        // Se não encontrar, pegar o próximo disponível
        if (foundIndex === -1) foundIndex = 0;
        
        const [selectedStory] = remainingStories.splice(foundIndex, 1);
        interleavedStories.push(selectedStory);
        lastProfileId = selectedStory.profile_id;
      }

      const newStories = interleavedStories.map(({ popularityScore, ...story }) => story) as PublicStory[];
      
      if (pageNum === 0) {
        // Remover duplicatas baseado no ID
        const uniqueStories = newStories.filter((story, index, self) =>
          index === self.findIndex((s) => s.id === story.id)
        );
        setStories(uniqueStories);
      } else {
        // Adicionar apenas stories que ainda não existem
        setStories(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const uniqueNew = newStories.filter(s => !existingIds.has(s.id));
          return [...prev, ...uniqueNew];
        });
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="w-full aspect-[9/16] rounded-xl" />
        ))}
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <>
        <div className="max-w-xl mx-auto px-4 py-12">
          <div className="text-center space-y-6">
            {/* Ícone */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 animate-pulse">
              <Sparkles className="w-10 h-10 text-white" />
            </div>

            {/* Título */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Você ainda não postou hoje
              </h2>
              <p className="text-muted-foreground text-base">
                Melhore a visibilidade do seu perfil profissional
              </p>
            </div>

            {/* Benefícios */}
            <div className="bg-muted/50 rounded-lg p-6 space-y-3 text-left max-w-md mx-auto">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Aumente sua visibilidade:</span> Stories aparecem no topo do feed para todos os usuários
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Destaque-se profissionalmente:</span> Contratantes e freelancers verão seu conteúdo primeiro
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Engajamento instantâneo:</span> Receba curtidas e gere conexões em tempo real
                </p>
              </div>
            </div>

            {/* Botão de ação */}
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              Postar Story
            </button>
          </div>
        </div>

        {/* Dialog de criação de story */}
        {dialogProfiles && dialogProfiles.length > 0 && (
          <CreateStoryDialog
            isOpen={isCreateDialogOpen}
            onClose={() => setIsCreateDialogOpen(false)}
            profiles={dialogProfiles}
            onStoryCreated={() => {
              setIsCreateDialogOpen(false);
              loadPublicStories(0);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div 
        ref={scrollContainerRef}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-4"
      >
        {/* Botão de Criar Story */}
        {dialogProfiles && dialogProfiles.length > 0 && (
          <div
            className="relative group cursor-pointer overflow-hidden rounded-xl transition-transform hover:scale-[1.02]"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <div className="relative w-full aspect-[9/16] bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex flex-col items-center justify-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-6">
                <Plus className="w-12 h-12 text-white" />
              </div>
              <p className="text-white font-bold text-lg">Publicar Story</p>
            </div>
          </div>
        )}

        {stories.map((story, index) => {
          const isNew = new Date().getTime() - new Date(story.created_at).getTime() < 3600000;
          const displayImage = story.thumbnail_url || story.media_url || '/placeholder.svg';
          const videoSrc = story.type === 'video' && story.media_url ? `${story.media_url}#t=5` : story.media_url;

          return (
            <div
              key={story.id}
              className="relative group cursor-pointer overflow-hidden rounded-xl transition-transform hover:scale-[1.02]"
              onClick={() => handleStoryClick(index)}
            >
              <div className="relative w-full aspect-[9/16]">
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
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm rounded-full p-1.5 shadow-lg">
                  {story.type === 'video' && <Video className="w-3.5 h-3.5 text-white" />}
                  {story.type === 'image' && <Image className="w-3.5 h-3.5 text-white" />}
                  {story.type === 'text' && <FileText className="w-3.5 h-3.5 text-white" />}
                </div>

                {/* Curtidas e comentários */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3">
                  {story.like_count > 0 && (
                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
                      <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                      <span className="text-white text-xs font-medium">{story.like_count}</span>
                    </div>
                  )}
                  {story.comment_count > 0 && (
                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
                      <MessageCircle className="w-3.5 h-3.5 text-white" />
                      <span className="text-white text-xs font-medium">{story.comment_count}</span>
                    </div>
                  )}
                </div>
                
                {story.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/50 backdrop-blur-sm rounded-full p-4 shadow-xl">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </div>
                )}
                
                <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="w-5 h-5 border border-white shadow-lg flex-shrink-0">
                      <AvatarImage src={story.profiles.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                        {getFirstName(story.profiles.full_name, story.profiles.username)?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold truncate drop-shadow-lg leading-tight">
                        {getFirstName(story.profiles.full_name, story.profiles.username)}
                      </p>
                      <p className="text-[9px] drop-shadow-lg leading-tight opacity-90">
                        {getRelativeTime(story.created_at)}
                      </p>
                    </div>
                    {story.like_count > 0 && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                        <span className="text-[10px] font-bold">{story.like_count}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}

        {/* Loading more indicator */}
        {hasMore && (
          <div ref={observerTarget} className="col-span-full flex items-center justify-center py-8">
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
          onClose={() => setIsViewerOpen(false)}
          allStories={stories}
          initialStoryIndex={selectedStoryIndex}
          currentProfileId={currentProfileId}
          onStoryDeleted={() => loadPublicStories(0)}
        />
      )}

      {dialogProfiles && dialogProfiles.length > 0 && (
        <CreateStoryDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          profiles={dialogProfiles}
          onStoryCreated={() => {
            setIsCreateDialogOpen(false);
            loadPublicStories(0);
          }}
        />
      )}
    </>
  );
};
