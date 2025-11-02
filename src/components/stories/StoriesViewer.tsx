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
import { StoryViewsDialog } from './StoryViewsDialog';
import { InteractiveStickerRenderer } from './InteractiveStickerRenderer';

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
  const [showViewsDialog, setShowViewsDialog] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef<number>(0);
  const { toast } = useToast();

  

  const STORY_DURATION = 15000; // 15 segundos

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

  useEffect(() => {
    if (!isOpen || stories.length === 0) return;

    const currentStory = stories[currentIndex];
    if (currentStory) {
      registerView(currentStory.id);
    }

    setIsPaused(false);
    let progressInterval: NodeJS.Timeout;
    let startTime = Date.now();
    let pausedTime = 0;
    let lastPauseStart = 0;

    const updateProgress = () => {
      if (isPaused || commentsOpen) {
        if (lastPauseStart === 0) {
          lastPauseStart = Date.now();
        }
        return;
      }

      if (lastPauseStart > 0) {
        pausedTime += Date.now() - lastPauseStart;
        lastPauseStart = 0;
      }

      const elapsed = Date.now() - startTime - pausedTime;
      const newProgress = (elapsed / STORY_DURATION) * 100;

      if (newProgress >= 100) {
        // Avançar para o próximo story automaticamente
        handleNext();
      } else {
        setProgress(newProgress);
      }
    };

    progressInterval = setInterval(updateProgress, 100);

    return () => clearInterval(progressInterval);
  }, [isOpen, stories, currentIndex, registerView, isPaused, commentsOpen]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      setMediaLoading(true);
    } else {
      onClose();
    }
  };

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
                      <div className="relative">
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
                        <p className="text-white font-medium text-[11px] drop-shadow-lg">
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
                          onClick={() => setShowViewsDialog(true)}
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
                              src={currentStory.media_url}
                              className="w-full h-full object-cover"
                              autoPlay
                              loop
                              muted
                              playsInline
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
                          <SafeImage
                            src={currentStory.media_url}
                            alt="Story"
                            className="w-full h-full object-contain transition-opacity duration-300"
                            style={{ opacity: mediaLoading ? 0 : 1 }}
                            onLoadStart={() => setMediaLoading(true)}
                            onLoad={() => setMediaLoading(false)}
                            onError={() => setMediaLoading(false)}
                          />
                        )}

                        {currentStory.type === 'video' && currentStory.media_url && (
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
                            style={{ opacity: mediaLoading ? 0 : 1 }}
                          />
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
                          <div className="absolute inset-0 pointer-events-auto z-10">
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
                    <div className="absolute top-20 right-4 z-20 flex items-center gap-2">
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
                  {currentProfileId && currentStory && (
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

      {/* Views Dialog */}
      {currentStory && isOwner && (
        <StoryViewsDialog
          storyId={currentStory.id}
          isOpen={showViewsDialog}
          onClose={() => setShowViewsDialog(false)}
        />
      )}
    </Dialog>
  );
}
