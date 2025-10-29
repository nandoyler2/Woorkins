import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ExternalLink, Volume2, VolumeX, User, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SafeImage } from '@/components/ui/safe-image';

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
  metadata?: {
    text_bold?: boolean;
    text_italic?: boolean;
  };
  profile?: {
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
}

export function StoriesViewer({ profileId, isOpen, onClose, currentProfileId }: StoriesViewerProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  

  const STORY_DURATION = 15000; // 15 segundos

  const loadStories = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profile_stories')
        .select(`
          *,
          profile:profiles(username, full_name, avatar_url)
        `)
        .eq('profile_id', profileId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      setStories(data || []);
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
  }, [profileId, toast]);

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
    }
  }, [isOpen, loadStories]);

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
      if (isPaused) {
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
        handleNext();
      } else {
        setProgress(newProgress);
      }
    };

    progressInterval = setInterval(updateProgress, 100);

    return () => clearInterval(progressInterval);
  }, [isOpen, stories, currentIndex, registerView, isPaused]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
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

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const currentStory = stories[currentIndex];
  const isOwner = currentProfileId === profileId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="z-[9999] max-w-lg h-[90vh] p-0 bg-transparent border-0 shadow-none overflow-hidden [&>button]:hidden">
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
          <div className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden bg-black">
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1.5 p-3">
            {stories.map((_, idx) => (
              <div
                key={idx}
                className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm"
              >
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 transition-all duration-100 shadow-lg shadow-purple-500/50"
                  style={{
                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4 mt-4">
            <div className="flex items-center gap-3 bg-black/30 backdrop-blur-md rounded-full pr-4 py-1.5 pl-1.5">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full blur-sm opacity-75" />
                {currentStory.profile?.avatar_url ? (
                  <SafeImage
                    src={currentStory.profile.avatar_url}
                    alt={currentStory.profile?.username || ''}
                    className="relative w-10 h-10 rounded-full border-2 border-white object-cover"
                  />
                ) : (
                  <div className="relative w-10 h-10 rounded-full border-2 border-white bg-muted flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-white font-semibold text-sm drop-shadow-lg">
                  {currentStory.profile?.full_name || currentStory.profile?.username}
                </p>
                <p className="text-white/80 text-xs drop-shadow-md">
                  {new Date(currentStory.created_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div 
            className="flex-1 flex items-center justify-center relative"
            onMouseDown={() => handleHoldPause(true)}
            onMouseUp={() => handleHoldPause(false)}
            onMouseLeave={() => handleHoldPause(false)}
            onTouchStart={() => handleHoldPause(true)}
            onTouchEnd={() => handleHoldPause(false)}
          >
            {/* Navigation areas */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer z-10"
              onClick={handlePrevious}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer z-10"
              onClick={handleNext}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            />

            {/* Story content */}
            {currentStory.type === 'image' && currentStory.media_url && (
              <SafeImage
                src={currentStory.media_url}
                alt="Story"
                className="w-full h-full object-contain"
              />
            )}

            {currentStory.type === 'video' && currentStory.media_url && (
              <video
                ref={videoRef}
                src={currentStory.media_url}
                autoPlay
                muted={isMuted}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.volume = volume;
                  }
                }}
                className="w-full h-full object-contain"
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

          {/* Footer - Link apenas para mídia */}
          {currentStory.link_url && currentStory.type !== 'text' && (
            <div className="absolute bottom-4 left-4 right-4 z-20">
              <a
                href={currentStory.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/20 backdrop-blur-md text-white px-4 py-3 rounded-full hover:bg-white/30 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">Ver link</span>
              </a>
            </div>
          )}

          {/* View count (se for o dono) */}
          {isOwner && (
            <div className="absolute bottom-4 right-4 z-20 bg-black/50 backdrop-blur-md text-white px-3 py-2 rounded-full text-xs">
              👁️ {currentStory.view_count} visualizações
            </div>
          )}

          {/* Navigation buttons */}
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}

          {currentIndex < stories.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          )}
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
