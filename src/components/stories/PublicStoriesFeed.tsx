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
import { InteractiveStickerRenderer } from "./InteractiveStickerRenderer";
interface PublicStory {
  id: string;
  profile_id: string;
  media_url: string | null;
  thumbnail_url: string | null;
  type: string;
  text_content: string | null;
  background_color: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  original_story_id?: string | null;
  original_profile_id?: string | null;
  text_position_x?: number | null;
  text_position_y?: number | null;
  text_scale?: number | null;
  media_position_x?: number | null;
  media_position_y?: number | null;
  media_scale?: number | null;
  metadata?: {
    text_bold?: boolean;
    text_italic?: boolean;
  };
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
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [newStoryIds, setNewStoryIds] = useState<Set<string>>(new Set());

  const STORIES_PER_PAGE = 20;

  // Verificar se o usuário postou stories hoje
  const checkIfPostedToday = useCallback(async () => {
    if (!currentProfileId) return;
    
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('profile_stories')
        .select('id')
        .eq('profile_id', currentProfileId)
        .gte('created_at', todayStart.toISOString())
        .limit(1)
        .maybeSingle();
      
      setHasPostedToday(!!data);
    } catch (error) {
      console.error('Error checking if posted today:', error);
    }
  }, [currentProfileId]);

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
    checkIfPostedToday();
  }, [user, userProfiles, checkIfPostedToday]);

  const loadPublicStories = useCallback(async (pageNum: number) => {
    try {
      const from = pageNum * STORIES_PER_PAGE;
      const to = from + STORIES_PER_PAGE - 1;

      // Buscar stories ordenados por updated_at (mais recente primeiro)
      const { data, error } = await supabase
        .from('profile_stories')
        .select(`
          id,
          profile_id,
          media_url,
          thumbnail_url,
          type,
          text_content,
          background_color,
          created_at,
          expires_at,
          updated_at,
          original_story_id,
          original_profile_id,
          text_position_x,
          text_position_y,
          text_scale,
          media_position_x,
          media_position_y,
          media_scale,
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
          story_comments(count),
          story_stickers(*)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Processar stories
      let processedStories = (data || []).map(story => {
        const likeCount = (story as any).story_likes?.[0]?.count || 0;
        const commentCount = (story as any).story_comments?.[0]?.count || 0;
        
        return {
          id: story.id,
          profile_id: story.profile_id,
          media_url: story.media_url,
          thumbnail_url: story.thumbnail_url,
          type: story.type,
          text_content: story.text_content,
          background_color: story.background_color,
          created_at: story.created_at,
          like_count: likeCount,
          comment_count: commentCount,
          original_story_id: story.original_story_id,
          original_profile_id: story.original_profile_id,
          text_position_x: story.text_position_x,
          text_position_y: story.text_position_y,
          text_scale: story.text_scale,
          media_position_x: story.media_position_x,
          media_position_y: story.media_position_y,
          media_scale: story.media_scale,
          profiles: story.profiles,
          original_profile: story.original_profile,
          story_stickers: (story as any).story_stickers || []
        };
      }) as PublicStory[];

      const newStories = processedStories;
      
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
  }, [STORIES_PER_PAGE, currentProfileId]);

  useEffect(() => {
    loadPublicStories(0);
    checkIfPostedToday();

    // Realtime updates
    const channel = supabase
      .channel('public-stories-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_stories',
        },
        async (payload) => {
          console.log('[PublicStoriesFeed] Novo story detectado:', payload.new);
          const newStoryId = payload.new.id as string;
          
          // Marcar como novo
          setNewStoryIds(prev => new Set(prev).add(newStoryId));
          
          // Remover a marcação de novo após 5 segundos
          setTimeout(() => {
            setNewStoryIds(prev => {
              const updated = new Set(prev);
              updated.delete(newStoryId);
              return updated;
            });
          }, 5000);
          
          // Recarregar stories
          await loadPublicStories(0);
          setPage(0);
          checkIfPostedToday();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profile_stories',
        },
        async (payload) => {
          console.log('[PublicStoriesFeed] Story atualizado (nova interação):', payload.new.id);
          // Quando um story recebe curtida ou comentário, ele volta para o topo
          await loadPublicStories(0);
          setPage(0);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'profile_stories',
        },
        (payload) => {
          console.log('[PublicStoriesFeed] Story deletado:', payload.old.id);
          setStories(prev => prev.filter(s => s.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log('[PublicStoriesFeed] Canal de realtime status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPublicStories, checkIfPostedToday]);

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
        {/* Botão de Criar Storie */}
        {dialogProfiles && dialogProfiles.length > 0 && (
          <div
            className="relative group cursor-pointer overflow-hidden rounded-xl transition-transform hover:scale-[1.02]"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <div className="relative w-full aspect-[9/16] bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex flex-col items-center justify-center gap-4">
              {/* Avatar do usuário como background */}
              {dialogProfiles[0]?.avatar_url && (
                <div className="absolute inset-0">
                  <SafeImage
                    src={dialogProfiles[0].avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover opacity-20"
                  />
                </div>
              )}
              <div className="relative bg-white/20 backdrop-blur-sm rounded-full p-6">
                <Plus className="w-12 h-12 text-white" />
              </div>
              <p className="relative text-white font-bold text-[10px] text-center px-4 leading-tight">
                {hasPostedToday 
                  ? 'Adicione mais stories e movimente seu perfil' 
                  : 'Você ainda não publicou stories hoje'}
              </p>
            </div>
          </div>
        )}

        {stories.map((story, index) => {
          const isRecentlyAdded = newStoryIds.has(story.id);
          const displayImage = story.thumbnail_url || story.media_url || '/placeholder.svg';
          const videoSrc = story.type === 'video' && story.media_url ? `${story.media_url}#t=5` : story.media_url;

          return (
            <div
              key={story.id}
              className={`relative group cursor-pointer overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                isRecentlyAdded ? 'animate-pulse ring-4 ring-primary/50' : ''
              }`}
              onClick={() => handleStoryClick(index)}
            >
              <div className="relative w-full aspect-[9/16]">
                {/* Story repostado - mostrar miniatura centralizada */}
                {story.original_story_id && story.original_profile ? (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900/30 via-black to-pink-900/30 flex flex-col items-center justify-center gap-2 p-4">
                    {/* Miniatura do story original */}
                    <div className="relative w-[65%] rounded-xl overflow-hidden shadow-2xl border border-white/20" style={{ aspectRatio: "9/16" }}>
                      {story.type === 'text' ? (
                        <div 
                          className="w-full h-full relative"
                          style={{ background: story.background_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                        >
                          <div
                            className="absolute"
                            style={{
                              left: `${story.text_position_x || 50}%`,
                              top: `${story.text_position_y || 50}%`,
                              transform: `translate(-50%, -50%) scale(${(story.text_scale || 1) * 0.4})`,
                            }}
                          >
                            <p 
                              className={`text-white text-center text-[10px] break-words ${
                                (story as any).metadata?.text_bold ? 'font-bold' : 'font-medium'
                              } ${
                                (story as any).metadata?.text_italic ? 'italic' : ''
                              }`}
                            >
                              {story.text_content}
                            </p>
                          </div>
                        </div>
                      ) : story.type === 'video' && videoSrc ? (
                        <div className="w-full h-full relative bg-black flex items-center justify-center">
                          {(story.media_position_x != null && story.media_position_y != null) ? (
                            <div
                              className="absolute"
                              style={{
                                left: `${story.media_position_x}%`,
                                top: `${story.media_position_y}%`,
                                transform: `translate(-50%, -50%) scale(${(story.media_scale || 1) * 0.5})`,
                                width: '100%',
                                height: '100%',
                              }}
                            >
                              <video
                                src={videoSrc}
                                className="w-full h-full object-cover"
                                preload="metadata"
                                muted
                                playsInline
                              />
                            </div>
                          ) : (
                            <video
                              src={videoSrc}
                              className="w-full h-full object-cover"
                              preload="metadata"
                              muted
                              playsInline
                            />
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full relative bg-black flex items-center justify-center">
                          {(story.media_position_x != null && story.media_position_y != null) ? (
                            <div
                              className="absolute"
                              style={{
                                left: `${story.media_position_x}%`,
                                top: `${story.media_position_y}%`,
                                transform: `translate(-50%, -50%) scale(${(story.media_scale || 1) * 0.5})`,
                                width: '100%',
                                height: '100%',
                              }}
                            >
                              <SafeImage
                                src={displayImage}
                                alt="Story original"
                                className="w-full h-full object-cover block"
                              />
                            </div>
                          ) : (
                            <SafeImage
                              src={displayImage}
                              alt="Story original"
                              className="w-full h-full object-cover block"
                            />
                          )}
                        </div>
                      )}

                      {/* Renderizar stickers na miniatura do repost - atrás dos ícones */}
                      {(story as any).story_stickers && (story as any).story_stickers.length > 0 && (
                        <div className="absolute inset-0 pointer-events-none z-0">
                          {(story as any).story_stickers.map((sticker: any) => (
                            <InteractiveStickerRenderer
                              key={sticker.id}
                              sticker={{
                                ...sticker,
                                story_id: story.id,
                                scale: (sticker.scale || 1) * 0.25
                              } as any}
                              isPreview={true}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Créditos do autor original */}
                    <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-2.5 py-1">
                      <Avatar className="w-5 h-5 border border-white/30 flex-shrink-0">
                        <AvatarImage src={story.original_profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-[9px]">
                          {story.original_profile.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white text-[10px] font-medium drop-shadow-md">
                        @{story.original_profile.username}
                      </span>
                    </div>
                  </div>
                ) : (
                    <>
                    {/* Story normal */}
                    <div className="relative w-full h-full">
                      {story.type === 'text' ? (
                        <div 
                          className="w-full h-full relative"
                          style={{ background: story.background_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                        >
                          <div
                            className="absolute"
                            style={{
                              left: `${story.text_position_x || 50}%`,
                              top: `${story.text_position_y || 50}%`,
                              transform: `translate(-50%, -50%) scale(${(story.text_scale || 1) * 0.6})`,
                            }}
                          >
                            <p 
                              className={`text-white text-center text-lg break-words ${
                                (story as any).metadata?.text_bold ? 'font-bold' : 'font-semibold'
                              } ${
                                (story as any).metadata?.text_italic ? 'italic' : ''
                              }`}
                            >
                              {story.text_content}
                            </p>
                          </div>
                        </div>
                      ) : story.type === 'video' && videoSrc ? (
                          <div className="w-full h-full relative bg-black flex items-center justify-center">
                            {(story.media_position_x != null && story.media_position_y != null) ? (
                              <div
                                className="absolute"
                                style={{
                                  left: `${story.media_position_x}%`,
                                  top: `${story.media_position_y}%`,
                                  transform: `translate(-50%, -50%) scale(${(story.media_scale || 1) * 0.8})`,
                                  width: '100%',
                                  height: '100%',
                                }}
                              >
                                <video
                                  src={videoSrc}
                                  className="w-full h-full object-cover"
                                  preload="metadata"
                                  muted
                                  playsInline
                                />
                              </div>
                            ) : (
                              <video
                                src={videoSrc}
                                className="w-full h-full object-cover"
                                preload="metadata"
                                muted
                                playsInline
                              />
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full relative bg-black flex items-center justify-center">
                            {(story.media_position_x != null && story.media_position_y != null) ? (
                              <div
                                className="absolute"
                                style={{
                                  left: `${story.media_position_x}%`,
                                  top: `${story.media_position_y}%`,
                                  transform: `translate(-50%, -50%) scale(${(story.media_scale || 1) * 0.8})`,
                                  width: '100%',
                                  height: '100%',
                                }}
                              >
                                <SafeImage
                                  src={displayImage}
                                  alt="Story"
                                  className="w-full h-full object-cover block"
                                />
                              </div>
                            ) : (
                              <SafeImage
                                src={displayImage}
                                alt="Story"
                                className="w-full h-full object-cover block"
                              />
                            )}
                          </div>
                        )}

                        {/* Renderizar stickers na miniatura - atrás dos ícones */}
                        {(story as any).story_stickers && (story as any).story_stickers.length > 0 && (
                          <div className="absolute inset-0 pointer-events-none z-0">
                            {(story as any).story_stickers.map((sticker: any) => (
                              <InteractiveStickerRenderer
                                key={sticker.id}
                                sticker={{
                                  ...sticker,
                                  story_id: story.id,
                                  scale: (sticker.scale || 1) * 0.4
                                } as any}
                                isPreview={true}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Curtidas e comentários juntos no topo esquerdo - apenas se tiver */}
                {(story.like_count > 0 || story.comment_count > 0) && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-lg">
                    {story.like_count > 0 && (
                      <>
                        <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                        <span className="text-white text-[10px] font-bold drop-shadow-md">{story.like_count}</span>
                      </>
                    )}
                    {story.comment_count > 0 && (
                      <>
                        <MessageCircle className="w-3 h-3 text-white fill-white" />
                        <span className="text-white text-[10px] font-bold drop-shadow-md">{story.comment_count}</span>
                      </>
                    )}
                  </div>
                )}
                
                {/* Ícone do tipo de post ou repost no topo direito */}
                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full p-1 shadow-lg">
                  {story.original_story_id ? (
                    <Repeat2 className="w-3 h-3 text-white" />
                  ) : (
                    <>
                      {story.type === 'video' && <Video className="w-3 h-3 text-white" />}
                      {story.type === 'image' && <Image className="w-3 h-3 text-white" />}
                      {story.type === 'text' && <FileText className="w-3 h-3 text-white" />}
                    </>
                  )}
                </div>
                
                {/* Badge NOVO no centro quando é recém adicionado */}
                {isRecentlyAdded && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-in fade-in zoom-in duration-500">
                    <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-black text-sm px-6 py-2 rounded-full shadow-2xl animate-pulse">
                      NOVO
                    </div>
                  </div>
                )}
                
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
