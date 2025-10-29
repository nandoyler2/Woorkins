import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';
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

    let progressInterval: NodeJS.Timeout;
    let startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / STORY_DURATION) * 100;

      if (newProgress >= 100) {
        handleNext();
      } else {
        setProgress(newProgress);
      }
    };

    progressInterval = setInterval(updateProgress, 100);

    return () => clearInterval(progressInterval);
  }, [isOpen, stories, currentIndex, registerView]);

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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'Escape') onClose();
  }, [currentIndex, stories.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen || stories.length === 0) return null;

  const currentStory = stories[currentIndex];
  const isOwner = currentProfileId === profileId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg h-[90vh] p-0 bg-black border-none">
        <div className="relative w-full h-full flex flex-col">
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
            {stories.map((_, idx) => (
              <div
                key={idx}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all"
                  style={{
                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4 mt-4">
            <div className="flex items-center gap-3">
              <SafeImage
                src={currentStory.profile?.avatar_url || ''}
                alt={currentStory.profile?.username || ''}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
              <div>
                <p className="text-white font-semibold text-sm">
                  {currentStory.profile?.full_name || currentStory.profile?.username}
                </p>
                <p className="text-white/70 text-xs">
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
          <div className="flex-1 flex items-center justify-center relative">
            {/* Navigation areas */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer z-10"
              onClick={handlePrevious}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer z-10"
              onClick={handleNext}
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
                src={currentStory.media_url}
                autoPlay
                muted
                className="w-full h-full object-contain"
              />
            )}

            {currentStory.type === 'text' && (
              <div
                className="w-full h-full flex items-center justify-center p-8"
                style={{ backgroundColor: currentStory.background_color || '#8B5CF6' }}
              >
                <p className="text-white text-2xl font-bold text-center break-words max-w-full">
                  {currentStory.text_content}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {currentStory.link_url && (
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
      </DialogContent>
    </Dialog>
  );
}
