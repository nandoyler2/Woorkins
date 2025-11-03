import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ExternalLink, Volume2, VolumeX, User, Play, Pause, Trash2, Repeat2, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SafeImage } from '@/components/ui/safe-image';
import { StoryCommentSection } from './StoryCommentSection';
import { useStoryLikes } from '@/hooks/useStoryLikes';
import { RepostStoryDialog } from './RepostStoryDialog';
import { InteractiveStickerRenderer } from './InteractiveStickerRenderer';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Sticker {
  id: string;
  story_id?: string;
  type: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  content: any;
  scale?: number;
}

interface Story {
  id: string;
  profile_id: string;
  type: string;
  media_url: string | null;
  text_content: string | null;
  background_color: string | null;
  link_url: string | null;
  created_at: string;
  view_count: number;
  original_story_id?: string | null;
  original_profile_id?: string | null;
  text_position_x?: number | null;
  text_position_y?: number | null;
  text_scale?: number | null;
  media_position_x?: number | null;
  media_position_y?: number | null;
  media_scale?: number | null;
  stickers?: Sticker[];
  metadata?: {
    text_bold?: boolean;
    text_italic?: boolean;
  };
  profile?: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
  original_profile?: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

interface StoriesViewerProps {
  profileId: string;
  isOpen: boolean;
  onClose: () => void;
  currentProfileId?: string;
  onStoryDeleted?: () => void;
  allStories?: any[];
  initialStoryIndex?: number;
}

// Função para formatar nome: apenas primeira letra maiúscula, resto minúscula, e apenas 2 primeiros nomes
const formatDisplayName = (fullName: string | null | undefined): string => {
  if (!fullName) return '';
  
  const names = fullName.trim().split(/\s+/);
  const firstTwoNames = names.slice(0, 2);
  
  return firstTwoNames
    .map(name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase())
    .join(' ');
};

export function StoriesViewer({ profileId, isOpen, onClose, currentProfileId, onStoryDeleted, allStories, initialStoryIndex }: StoriesViewerProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex || 0);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('stories-muted');
    return saved ? JSON.parse(saved) : false;
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('stories-volume');
    return saved ? parseFloat(saved) : 1;
  });
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [showRepostDialog, setShowRepostDialog] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likeAnimations, setLikeAnimations] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const [showViews, setShowViews] = useState(false);
  const [views, setViews] = useState<any[]>([]);
  const [likes, setLikes] = useState<any[]>([]);
  const [statsTab, setStatsTab] = useState<'views' | 'likes'>('views');
  const [loadingStats, setLoadingStats] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef<number>(0);
  
  // Refs para controle preciso de pausa
  const STORY_DURATION = 10000;
  const startTimeRef = useRef<number>(Date.now());
  const pausedTimeRef = useRef<number>(0);
  const lastPauseStartRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  

  // Atualizar currentIndex quando initialStoryIndex mudar
  useEffect(() => {
    if (initialStoryIndex !== undefined && initialStoryIndex !== currentIndex) {
      setCurrentIndex(initialStoryIndex);
      setProgress(0);
      setMediaLoading(true);
    }
  }, [initialStoryIndex]);

  // Reset index quando stories mudarem e initialStoryIndex for definido
  useEffect(() => {
    if (stories.length > 0 && initialStoryIndex !== undefined) {
      setCurrentIndex(initialStoryIndex);
      setProgress(0);
      setMediaLoading(true);
    }
  }, [stories.length, initialStoryIndex]);

  const loadStories = useCallback(async () => {
    // Se temos allStories (feed público), buscar stickers para cada story
    if (allStories && allStories.length > 0) {
      const mappedStories = await Promise.all(allStories.map(async (story) => {
        // Buscar stickers do story
        const { data: stickersData } = await supabase
          .from('story_stickers')
          .select('*')
          .eq('story_id', story.id);

        return {
          id: story.id,
          profile_id: story.profile_id,
          type: story.type,
          media_url: story.media_url,
          text_content: story.text_content,
          background_color: null,
          link_url: null,
          created_at: story.created_at,
          view_count: 0,
          original_story_id: story.original_story_id,
          original_profile_id: story.original_profile_id,
          profile: story.profiles,
          original_profile: story.original_profile,
          stickers: stickersData || []
        };
      }));
      setStories(mappedStories);
      setIsLoading(false);
      return;
    }

    // Senão, buscar stories do perfil específico (comportamento original)
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profile_stories')
        .select(`
          *,
          profile:profiles!profile_stories_profile_id_fkey(username, full_name, avatar_url),
          original_profile:profiles!profile_stories_original_profile_id_fkey(username, full_name, avatar_url),
          story_stickers(*)
        `)
        .eq('profile_id', profileId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }); // Mudado para descendente para manter consistência

      if (error) throw error;

      // Mapear stories com stickers
      const mappedStories = (data || []).map((story: any) => ({
        ...story,
        stickers: story.story_stickers || []
      }));

      setStories(mappedStories);
    } catch (error) {
      console.error('Error loading stories:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os stories',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [profileId, toast, allStories]);

  const registerView = useCallback(async (storyId: string) => {
    if (!currentProfileId || currentProfileId === profileId) return;

    try {
      const { error: insertError } = await supabase.from('story_views').insert({
        story_id: storyId,
        viewer_profile_id: currentProfileId,
      });

      // Se não houve erro (visualização registrada pela primeira vez), incrementar contador
      if (!insertError) {
        // Buscar o contador atual
        const { data: storyData } = await supabase
          .from('profile_stories')
          .select('view_count')
          .eq('id', storyId)
          .single();

        if (storyData) {
          await supabase
            .from('profile_stories')
            .update({ view_count: (storyData.view_count || 0) + 1 })
            .eq('id', storyId);
        }
      }
    } catch (error) {
      // Ignorar erros de visualização duplicada
      console.log('View already registered');
    }
  }, [currentProfileId, profileId]);

  useEffect(() => {
    if (isOpen) {
      loadStories();
      // Resetar índice quando initialStoryIndex mudar
      if (initialStoryIndex !== undefined) {
        setCurrentIndex(initialStoryIndex);
      }
    }
  }, [isOpen, loadStories, initialStoryIndex]);

  // Realtime para atualizar view_count
  useEffect(() => {
    if (!isOpen || stories.length === 0) return;

    const currentStory = stories[currentIndex];
    if (!currentStory) return;

    // Listener para atualizações em tempo real do view_count
    const channel = supabase
      .channel(`story-views-${currentStory.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'story_views',
          filter: `story_id=eq.${currentStory.id}`,
        },
        async () => {
          // Buscar o novo view_count
          const { data: storyData } = await supabase
            .from('profile_stories')
            .select('view_count')
            .eq('id', currentStory.id)
            .single();

          if (storyData) {
            // Atualizar o story na lista local
            setStories(prev => prev.map(s => 
              s.id === currentStory.id 
                ? { ...s, view_count: storyData.view_count }
                : s
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, stories, currentIndex]);

  // Função para avançar para o próximo story
  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      setMediaLoading(true);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  // Efeito para inicializar e trocar de story
  useEffect(() => {
    if (!isOpen || stories.length === 0) return;

    const currentStory = stories[currentIndex];
    if (currentStory) {
      registerView(currentStory.id);
    }

    // Reset completo ao trocar de story
    setProgress(0);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    pausedTimeRef.current = 0;
    lastPauseStartRef.current = 0;

    // Limpar interval anterior se existir
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isOpen, stories, currentIndex, registerView]);

  // Efeito separado para gerenciar progresso
  useEffect(() => {
    if (!isOpen || stories.length === 0 || isPaused || commentsOpen) return;

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
      const newProgress = (elapsed / STORY_DURATION) * 100;

      if (newProgress >= 100) {
        handleNext();
      } else {
        setProgress(newProgress);
      }
    };

    // Iniciar interval
    intervalRef.current = setInterval(updateProgress, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, stories, currentIndex, isPaused, commentsOpen, handleNext]);

  // Efeito para controlar pausa
  useEffect(() => {
    if (isPaused || commentsOpen) {
      // Marcar tempo de pausa se ainda não marcou
      if (lastPauseStartRef.current === 0) {
        lastPauseStartRef.current = Date.now();
      }
    } else {
      // Ao despausar, calcular tempo pausado acumulado
      if (lastPauseStartRef.current > 0) {
        pausedTimeRef.current += Date.now() - lastPauseStartRef.current;
        lastPauseStartRef.current = 0;
      }
    }
  }, [isPaused, commentsOpen]);


  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      setMediaLoading(true);
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('stories-muted', JSON.stringify(newMuted));
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    localStorage.setItem('stories-volume', newVolume.toString());
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume === 0) {
        setIsMuted(true);
        localStorage.setItem('stories-muted', 'true');
      } else if (isMuted) {
        setIsMuted(false);
        localStorage.setItem('stories-muted', 'false');
      }
    }
  };

  const togglePause = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    if (videoRef.current) {
      if (newPausedState) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleHoldPause = (shouldPause: boolean) => {
    setIsPaused(shouldPause);
    if (videoRef.current && currentStory.type === 'video') {
      if (shouldPause) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'Escape') onClose();
  }, [currentIndex, stories.length]);

  const handleDeleteStory = async () => {
    if (!currentStory) return;
    
    setDeleting(true);
    try {
      // Se tiver mídia, deletar do storage
      if (currentStory.media_url) {
        const urlParts = currentStory.media_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const { error: storageError } = await supabase.storage
          .from('stories')
          .remove([`${currentStory.profile_id}/${fileName}`]);
        
        if (storageError) {
          console.error('Error deleting from storage:', storageError);
        }
      }

      // Deletar do banco
      const { error: dbError } = await supabase
        .from('profile_stories')
        .delete()
        .eq('id', currentStory.id);

      if (dbError) throw dbError;

      toast({
        title: 'Storie excluído',
        description: 'Seu storie foi excluído com sucesso',
      });

      // Remover da lista local
      const newStories = stories.filter(s => s.id !== currentStory.id);
      setStories(newStories);

      // Notificar o pai sobre a exclusão
      if (onStoryDeleted) {
        onStoryDeleted();
      }

      // Se não tem mais stories, fechar
      if (newStories.length === 0) {
        onClose();
      } else {
        // Se estava no último, voltar um
        if (currentIndex >= newStories.length) {
          setCurrentIndex(Math.max(0, newStories.length - 1));
        }
      }

      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting story:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o story',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const loadStoryStats = useCallback(async (storyId: string) => {
    setLoadingStats(true);
    try {
      // Buscar visualizações (excluindo o dono do story)
      const { data: viewsData } = await supabase
        .from('story_views')
        .select(`
          viewer_profile_id,
          profiles:viewer_profile_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('story_id', storyId)
        .neq('viewer_profile_id', profileId) // Excluir o dono
        .order('viewed_at', { ascending: false });

      // Buscar curtidas (excluindo o dono do story)
      const { data: likesData } = await supabase
        .from('story_likes')
        .select(`
          profile_id,
          profiles:profile_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('story_id', storyId)
        .neq('profile_id', profileId) // Excluir o dono
        .order('created_at', { ascending: false });

      setViews(viewsData?.map(v => v.profiles).filter(Boolean) || []);
      setLikes(likesData?.map(l => l.profiles).filter(Boolean) || []);
    } catch (error) {
      console.error('Error loading story stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [profileId]);

  const handleShowStats = (storyId: string) => {
    setShowViews(true);
    setCommentsOpen(true);
    loadStoryStats(storyId);
  };

  const handleCloseStats = () => {
    setShowViews(false);
    setCommentsOpen(false);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const currentStory = stories[currentIndex];
  const isOwner = currentProfileId === profileId;
  const storyLikes = useStoryLikes(currentStory?.id || null);

  const handleDoubleTap = async (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Duplo clique detectado
      e.preventDefault();
      e.stopPropagation();

      // Pegar coordenadas do clique
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
      const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

      // Adicionar animação
      const animId = `like-${Date.now()}`;
      setLikeAnimations(prev => [...prev, { id: animId, x, y }]);

      // Remover animação após 1 segundo
      setTimeout(() => {
        setLikeAnimations(prev => prev.filter(anim => anim.id !== animId));
      }, 1000);

      // Curtir o story
      await storyLikes.toggleLike();
      
      lastTapRef.current = 0; // Reset
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="z-[9999] p-0 bg-transparent border-0 shadow-none overflow-visible [&>button]:hidden sm:rounded-none outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:outline-none focus-visible:ring-0 max-w-none lg:w-auto">
        <DialogTitle className="sr-only">Stories</DialogTitle>
        <DialogDescription className="sr-only">Visualizador de stories</DialogDescription>
        {isLoading || stories.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Carregando stories...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full max-w-7xl mx-auto px-4">
            {/* Container centralizado com story fixo */}
            <div className="relative min-h-screen w-full flex items-center justify-center">
              {/* Wrapper relativo para ancorar as miniaturas */}
              <div className="relative">
                {/* Miniaturas esquerdas - posicionadas absolutamente */}
                <div 
                  className="hidden lg:flex flex-row items-center gap-2 flex-nowrap"
                  style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    right: 'calc(100% + 24px)', 
                    transform: 'translateY(-50%)'
                  }}
                >
                  {stories.slice(Math.max(0, currentIndex - 3), currentIndex).map((story, idx) => {
                    const actualIndex = Math.max(0, currentIndex - 3) + idx;
                    return (
                      <div
                        key={story.id}
                        onClick={() => {
                          setCurrentIndex(actualIndex);
                          setProgress(0);
                          setMediaLoading(true);
                        }}
                        className="cursor-pointer group relative w-28 rounded-lg overflow-hidden bg-black transition-all hover:scale-105"
                        style={{ aspectRatio: "9 / 16" }}
                      >
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors z-10" />
                        {story.type === 'image' && story.media_url && (
                          <SafeImage
                            src={story.media_url}
                            alt="Story"
                            className="w-full h-full object-cover"
                          />
                        )}
                        {story.type === 'video' && story.media_url && (
                          <video
                            src={story.media_url}
                            className="w-full h-full object-cover"
                            muted
                          />
                        )}
                        {story.type === 'text' && (
                          <div
                            className="w-full h-full flex items-center justify-center p-1"
                            style={{ background: story.background_color || '#8B5CF6' }}
                          >
                            <p className="text-white text-[6px] text-center line-clamp-2">
                              {story.text_content}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Container do Story Principal - sempre centralizado e fixo */}
                <div className="relative flex flex-col rounded-2xl overflow-hidden bg-black" style={{ width: "min(90vw, 500px, calc((9/16) * 90vh))", aspectRatio: "9 / 16" }}>
                  {/* Progress bar - apenas do story atual */}
                  <div className="absolute top-0 left-0 right-0 z-20 p-3">
                    <div className="h-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 transition-all duration-100 shadow-lg shadow-purple-500/50"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Top shadow gradient for better visibility */}
                  <div className="absolute top-0 left-0 right-0 h-32 z-10 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none" />

                  {/* Header */}
                  <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4 mt-2">
                    <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-full pr-3 py-1 pl-1">
                      <div 
                        className="relative cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          const username = currentStory.profile?.username;
                          if (username) {
                            window.open(`/perfil/${username}`, '_blank');
                          }
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full blur-sm opacity-75" />
                        {currentStory.profile?.avatar_url ? (
                          <SafeImage
                            src={currentStory.profile.avatar_url}
                            alt={currentStory.profile?.username || ''}
                            className="relative w-7 h-7 rounded-full border border-white object-cover"
                          />
                        ) : (
                          <div className="relative w-7 h-7 rounded-full border border-white bg-muted flex items-center justify-center">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p 
                          className="text-white font-medium text-[11px] drop-shadow-lg cursor-pointer hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            const username = currentStory.profile?.username;
                            if (username) {
                              window.open(`/perfil/${username}`, '_blank');
                            }
                          }}
                        >
                          @{currentStory.profile?.username || 'usuario'}
                        </p>
                        <span className="text-white/60 text-[11px]">•</span>
                        <p className="text-white/70 text-[11px] drop-shadow-md">
                          {new Date(currentStory.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* View count (se for o dono) */}
                      {isOwner && (
                        <button
                          onClick={() => handleShowStats(currentStory.id)}
                          className="bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1 hover:bg-black/70 transition-colors cursor-pointer"
                        >
                          <span>👁️</span>
                          <span>{currentStory.view_count}</span>
                        </button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-white hover:bg-white/20"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <div 
                    className="flex-1 flex items-center justify-center relative"
                    onMouseDown={() => handleHoldPause(true)}
                    onMouseUp={() => handleHoldPause(false)}
                    onMouseLeave={() => handleHoldPause(false)}
                    onTouchStart={() => handleHoldPause(true)}
                    onTouchEnd={() => handleHoldPause(false)}
                    onClick={handleDoubleTap}
                  >
                    {/* Animações de curtida */}
                    {likeAnimations.map((anim) => (
                      <div
                        key={anim.id}
                        className="absolute pointer-events-none z-30 animate-[scale-in_0.3s_ease-out,fade-out_0.5s_0.5s_ease-out]"
                        style={{ left: anim.x, top: anim.y, transform: 'translate(-50%, -50%)' }}
                      >
                        <Heart className="w-24 h-24 fill-white text-white drop-shadow-2xl" />
                      </div>
                    ))}

                    {/* Loading Indicator */}
                    {mediaLoading && currentStory.type !== 'text' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full blur-xl opacity-75 animate-pulse" />
                          <div className="relative w-16 h-16 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center animate-spin">
                            <div className="w-12 h-12 bg-black rounded-full" />
                          </div>
                        </div>
                        <p className="mt-4 text-white font-medium">Carregando...</p>
                      </div>
                    )}

                    {/* Story content - Repost style Instagram */}
                    {currentStory.original_story_id && currentStory.original_profile ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20">
                        {/* Mensagem de quem repostou (se houver) */}
                        {currentStory.text_content && (
                          <p className="text-white text-center text-lg font-medium px-6 drop-shadow-lg max-w-md">
                            {currentStory.text_content}
                          </p>
                        )}

                        {/* Miniatura do story original */}
                        <div className="relative w-[70%] max-w-[320px] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20" style={{ aspectRatio: "9/16" }}>
                          {currentStory.type === 'image' && currentStory.media_url && (
                            <SafeImage
                              src={currentStory.media_url}
                              alt="Story original"
                              className="w-full h-full object-cover"
                              onLoadStart={() => setMediaLoading(true)}
                              onLoad={() => setMediaLoading(false)}
                              onError={() => setMediaLoading(false)}
                            />
                          )}
                          
                          {currentStory.type === 'video' && currentStory.media_url && (
                            <video
                              ref={videoRef}
                              src={currentStory.media_url}
                              className="w-full h-full object-contain"
                              autoPlay
                              loop
                              muted={isMuted}
                              playsInline
                              onLoadedMetadata={() => {
                                if (videoRef.current) {
                                  videoRef.current.volume = volume;
                                }
                              }}
                              onLoadStart={() => setMediaLoading(true)}
                              onLoadedData={() => setMediaLoading(false)}
                              onError={() => setMediaLoading(false)}
                            />
                          )}

                          {currentStory.type === 'text' && (
                            <div
                              className="w-full h-full flex items-center justify-center p-6"
                              style={{ background: currentStory.background_color || '#8B5CF6' }}
                            >
                              <p className="text-white text-base text-center break-words leading-relaxed">
                                {currentStory.text_content}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Créditos do autor original */}
                        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full">
                          {currentStory.original_profile.avatar_url ? (
                            <SafeImage
                              src={currentStory.original_profile.avatar_url}
                              alt={currentStory.original_profile.username}
                              className="w-7 h-7 rounded-full object-cover border border-white/50"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center border border-white/50">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                          <span className="text-white text-sm font-medium drop-shadow-lg">
                            @{currentStory.original_profile.username}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Story content normal (não é repost) */}
                        {currentStory.type === 'image' && currentStory.media_url && (
                          <div 
                            className="w-full h-full relative bg-black"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {(currentStory.media_position_x != null && currentStory.media_position_y != null) ? (
                              <div
                                className="absolute"
                                style={{
                                  left: `${currentStory.media_position_x}%`,
                                  top: `${currentStory.media_position_y}%`,
                                  transform: `translate(-50%, -50%) scale(${currentStory.media_scale || 1})`,
                                  width: '100%',
                                  height: '100%',
                                }}
                              >
                                <SafeImage
                                  src={currentStory.media_url}
                                  alt="Story"
                                  className="w-full h-full object-cover transition-opacity duration-300"
                                  style={{ 
                                    opacity: mediaLoading ? 0 : 1,
                                    display: 'block'
                                  }}
                                  onLoadStart={() => setMediaLoading(true)}
                                  onLoad={() => setMediaLoading(false)}
                                  onError={() => setMediaLoading(false)}
                                />
                              </div>
                            ) : (
                              <SafeImage
                                src={currentStory.media_url}
                                alt="Story"
                                className="w-full h-full object-cover transition-opacity duration-300"
                                style={{ 
                                  opacity: mediaLoading ? 0 : 1,
                                  display: 'block'
                                }}
                                onLoadStart={() => setMediaLoading(true)}
                                onLoad={() => setMediaLoading(false)}
                                onError={() => setMediaLoading(false)}
                              />
                            )}
                          </div>
                        )}

                        {currentStory.type === 'video' && currentStory.media_url && (
                          <div 
                            className="w-full h-full relative bg-black"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {(currentStory.media_position_x != null && currentStory.media_position_y != null) ? (
                              <div
                                className="absolute"
                                style={{
                                  left: `${currentStory.media_position_x}%`,
                                  top: `${currentStory.media_position_y}%`,
                                  transform: `translate(-50%, -50%) scale(${currentStory.media_scale || 1})`,
                                  width: '100%',
                                  height: '100%',
                                }}
                              >
                                <video
                                  ref={videoRef}
                                  src={`${currentStory.media_url}#t=5`}
                                  autoPlay
                                  muted={isMuted}
                                  onLoadedMetadata={() => {
                                    if (videoRef.current) {
                                      videoRef.current.volume = volume;
                                    }
                                  }}
                                  onLoadStart={() => setMediaLoading(true)}
                                  onLoadedData={() => setMediaLoading(false)}
                                  onError={() => setMediaLoading(false)}
                                  className="w-full h-full object-contain transition-opacity duration-300"
                                  style={{ 
                                    opacity: mediaLoading ? 0 : 1,
                                    display: 'block'
                                  }}
                                />
                              </div>
                            ) : (
                              <video
                                ref={videoRef}
                                src={`${currentStory.media_url}#t=5`}
                                autoPlay
                                muted={isMuted}
                                onLoadedMetadata={() => {
                                  if (videoRef.current) {
                                    videoRef.current.volume = volume;
                                  }
                                }}
                                onLoadStart={() => setMediaLoading(true)}
                                onLoadedData={() => setMediaLoading(false)}
                                onError={() => setMediaLoading(false)}
                                className="w-full h-full object-contain transition-opacity duration-300"
                                style={{ 
                                  opacity: mediaLoading ? 0 : 1,
                                  display: 'block'
                                }}
                              />
                            )}
                          </div>
                        )}

                        {currentStory.type === 'text' && (
                          <div
                            className="w-full h-full flex items-center justify-center p-8"
                            style={{ background: currentStory.background_color || '#8B5CF6' }}
                          >
                            {currentStory.link_url ? (
                              <a
                                href={currentStory.link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-white text-2xl text-center break-words max-w-full leading-relaxed drop-shadow-lg hover:scale-105 transition-transform cursor-pointer ${
                                  currentStory.metadata?.text_bold ? 'font-bold' : 'font-semibold'
                                } ${
                                  currentStory.metadata?.text_italic ? 'italic' : ''
                                }`}
                              >
                                {currentStory.text_content}
                              </a>
                            ) : (
                              <p
                                className={`text-white text-2xl text-center break-words max-w-full leading-relaxed drop-shadow-lg ${
                                  currentStory.metadata?.text_bold ? 'font-bold' : 'font-semibold'
                                } ${
                                  currentStory.metadata?.text_italic ? 'italic' : ''
                                }`}
                              >
                                {currentStory.text_content}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Renderizar stickers sobre o conteúdo */}
                        {currentStory.stickers && currentStory.stickers.length > 0 && (
                          <div className="absolute inset-0 pointer-events-auto z-30">
                            {currentStory.stickers.map((sticker) => (
                              <InteractiveStickerRenderer
                                key={sticker.id}
                                sticker={{
                                  ...sticker,
                                  story_id: currentStory.id,
                                  scale: sticker.scale || 1
                                } as any}
                                isPreview={false}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Play/Pause e Volume control para vídeos */}
                        {currentStory.type === 'video' && (
                          <div className="absolute top-20 right-4 z-40 flex items-center gap-2">
                      {/* Play/Pause button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={togglePause}
                        className="bg-black/30 backdrop-blur-md text-white hover:bg-black/50 rounded-full"
                      >
                        {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                      </Button>

                      {/* Volume control */}
                      <div 
                        className="flex items-center gap-2"
                        onMouseEnter={() => setShowVolumeSlider(true)}
                        onMouseLeave={() => setShowVolumeSlider(false)}
                      >
                        {showVolumeSlider && (
                          <div className="bg-black/50 backdrop-blur-md rounded-full px-3 py-2 flex items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={volume}
                              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                              className="w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
                            />
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleMute}
                          className="bg-black/30 backdrop-blur-md text-white hover:bg-black/50 rounded-full"
                        >
                          {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Seção de comentários */}
                  {currentProfileId && currentStory && !showViews && (
                    <StoryCommentSection
                      storyId={currentStory.id}
                      currentProfileId={currentProfileId}
                      isLiked={storyLikes.isLiked}
                      onToggleLike={storyLikes.toggleLike}
                      isOwner={isOwner}
                      onRepost={() => setShowRepostDialog(true)}
                      onCommentsToggle={setCommentsOpen}
                    />
                  )}

                  {/* Tela de visualizações e curtidas */}
                  {showViews && isOwner && (
                    <div className="absolute inset-0 bg-black/95 z-40 flex flex-col animate-in slide-in-from-bottom duration-300">
                      <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <h3 className="text-white font-semibold text-lg">Estatísticas do Story</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCloseStats}
                          className="text-white hover:bg-white/10"
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </div>

                      {/* Tabs */}
                      <div className="flex border-b border-white/10">
                        <button
                          onClick={() => setStatsTab('views')}
                          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            statsTab === 'views'
                              ? 'text-white border-b-2 border-white'
                              : 'text-white/60 hover:text-white'
                          }`}
                        >
                          👁️ Visualizações ({views.length})
                        </button>
                        <button
                          onClick={() => setStatsTab('likes')}
                          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            statsTab === 'likes'
                              ? 'text-white border-b-2 border-white'
                              : 'text-white/60 hover:text-white'
                          }`}
                        >
                          ❤️ Curtidas ({likes.length})
                        </button>
                      </div>

                      {/* Lista */}
                      <ScrollArea className="flex-1 px-4 py-4">
                        {loadingStats ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(statsTab === 'views' ? views : likes).length === 0 ? (
                              <p className="text-center text-white/60 py-8">Nenhum registro ainda</p>
                            ) : (
                              (statsTab === 'views' ? views : likes).map((profile: any) => (
                                <div
                                  key={profile.id}
                                  className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                  {profile.avatar_url ? (
                                    <SafeImage
                                      src={profile.avatar_url}
                                      alt={profile.full_name || profile.username}
                                      className="w-10 h-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                      <User className="w-5 h-5 text-white/60" />
                                    </div>
                                  )}
                                   <div className="flex-1 min-w-0">
                                     <p className="font-medium text-sm text-white truncate">
                                       {formatDisplayName(profile.full_name)}
                                     </p>
                                     <p className="text-xs text-white/60 truncate">
                                       @{profile.username}
                                     </p>
                                   </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  )}

                  {/* Footer - Delete button */}
                  <div className="absolute bottom-20 left-4 right-4 z-20 flex items-end justify-between">
                    <div className="flex gap-2">
                      {/* Delete button for owner */}
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowDeleteDialog(true)}
                          className="bg-black/50 backdrop-blur-md text-white hover:bg-red-500/50 rounded-full"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Miniaturas direitas - posicionadas absolutamente */}
                <div 
                  className="hidden lg:flex flex-row items-center gap-2 flex-nowrap"
                  style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: 'calc(100% + 24px)', 
                    transform: 'translateY(-50%)'
                  }}
                >
                  {stories.slice(currentIndex + 1, Math.min(stories.length, currentIndex + 4)).map((story, idx) => {
                    const actualIndex = currentIndex + 1 + idx;
                    return (
                      <div
                        key={story.id}
                        onClick={() => {
                          setCurrentIndex(actualIndex);
                          setProgress(0);
                          setMediaLoading(true);
                        }}
                        className="cursor-pointer group relative w-28 rounded-lg overflow-hidden bg-black transition-all hover:scale-105"
                        style={{ aspectRatio: "9 / 16" }}
                      >
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors z-10" />
                        {story.type === 'image' && story.media_url && (
                          <SafeImage
                            src={story.media_url}
                            alt="Story"
                            className="w-full h-full object-cover"
                          />
                        )}
                        {story.type === 'video' && story.media_url && (
                          <video
                            src={story.media_url}
                            className="w-full h-full object-cover"
                            muted
                          />
                        )}
                        {story.type === 'text' && (
                          <div
                            className="w-full h-full flex items-center justify-center p-1"
                            style={{ background: story.background_color || '#8B5CF6' }}
                          >
                            <p className="text-white text-[6px] text-center line-clamp-2">
                              {story.text_content}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="z-[10000] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir storie?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Seu storie será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStory}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Repost Dialog */}
      {currentStory && currentProfileId && (
        <RepostStoryDialog
          story={currentStory}
          isOpen={showRepostDialog}
          onClose={() => setShowRepostDialog(false)}
          currentProfileId={currentProfileId}
          onRepostSuccess={() => {
            toast({
              title: 'Compartilhado!',
              description: 'Story repostado com sucesso',
            });
          }}
        />
      )}
    </Dialog>
  );
}
