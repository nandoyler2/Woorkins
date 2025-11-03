import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SafeImage } from '@/components/ui/safe-image';
import { Loader2, User, Repeat2 } from 'lucide-react';

interface Story {
  id: string;
  profile_id: string;
  type: string;
  media_url: string | null;
  text_content: string | null;
  background_color: string | null;
  created_at: string;
  profile?: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

interface RepostStoryDialogProps {
  story: Story;
  isOpen: boolean;
  onClose: () => void;
  currentProfileId: string;
  onRepostSuccess?: () => void;
}

export function RepostStoryDialog({ story, isOpen, onClose, currentProfileId, onRepostSuccess }: RepostStoryDialogProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleRepost = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Criar repost do story
      const { error } = await supabase
        .from('profile_stories')
        .insert({
          profile_id: currentProfileId,
          type: story.type,
          media_url: story.media_url,
          text_content: message || null,
          background_color: story.background_color,
          original_story_id: story.id,
          original_profile_id: story.profile_id,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
        });

      if (error) throw error;

      toast({
        title: 'Story repostado!',
        description: 'O story foi compartilhado no seu perfil',
      });

      if (onRepostSuccess) onRepostSuccess();
      onClose();
      setMessage('');
    } catch (error) {
      console.error('Error reposting story:', error);
      toast({
        title: 'Erro ao repostar',
        description: 'Não foi possível compartilhar o story',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-2 shadow-2xl z-[10000]">
        {/* Header com gradiente */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-teal-600 to-blue-600"></div>
        
        <DialogHeader className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950 dark:to-teal-950 rounded-full border-2 border-primary/20">
              <Repeat2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                Repostar Story
              </DialogTitle>
              <DialogDescription className="text-sm">
                Compartilhe no seu perfil
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Preview do story original com aspect ratio correto */}
          <div 
            className="relative rounded-xl overflow-hidden bg-black/5 dark:bg-black/20 border-2 border-border/50 shadow-lg" 
            style={{ aspectRatio: "9 / 16", maxHeight: "400px" }}
          >
            {story.type === 'image' && story.media_url && (
              <SafeImage
                src={story.media_url}
                alt="Story Preview"
                className="w-full h-full object-cover"
              />
            )}
            {story.type === 'video' && story.media_url && (
              <video
                src={story.media_url}
                className="w-full h-full object-cover"
                muted
                loop
                autoPlay
                playsInline
              />
            )}
            {story.type === 'text' && (
              <div
                className="w-full h-full flex items-center justify-center p-6"
                style={{ background: story.background_color || '#8B5CF6' }}
              >
                <p className="text-white text-xl text-center break-words font-medium">
                  {story.text_content}
                </p>
              </div>
            )}

            {/* Crédito ao autor original com visual melhorado */}
            <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-md rounded-lg p-2.5 border border-white/10">
              <div className="flex items-center gap-2.5">
                {story.profile?.avatar_url ? (
                  <SafeImage
                    src={story.profile.avatar_url}
                    alt={story.profile.username}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-white/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-white/20">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    @{story.profile?.username || 'usuario'}
                  </p>
                  <p className="text-white/60 text-xs">Story original</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mensagem opcional com visual melhorado */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Adicione uma mensagem (opcional)
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              maxLength={200}
              rows={3}
              disabled={isSubmitting}
              className="resize-none border-2 focus:border-primary/50"
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/200 caracteres
            </p>
          </div>

          {/* Info sobre repost */}
          <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Repeat2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <p>
                Ao repostar, o story será compartilhado no seu perfil com créditos ao autor original e ficará disponível por 24 horas.
              </p>
            </div>
          </div>

          {/* Botões com gradiente */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 border-2"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRepost}
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Repostando...
                </>
              ) : (
                <>
                  <Repeat2 className="w-4 h-4 mr-2" />
                  Repostar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
