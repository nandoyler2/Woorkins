import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SafeImage } from '@/components/ui/safe-image';
import { Loader2, User } from 'lucide-react';

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Repostar Story</DialogTitle>
          <DialogDescription>
            Compartilhe este story no seu perfil
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview do story original */}
          <div className="relative rounded-lg overflow-hidden bg-muted" style={{ aspectRatio: "9 / 16", maxHeight: "400px" }}>
            {story.type === 'image' && story.media_url && (
              <SafeImage
                src={story.media_url}
                alt="Story Preview"
                className="w-full h-full object-contain"
              />
            )}
            {story.type === 'video' && story.media_url && (
              <video
                src={story.media_url}
                className="w-full h-full object-contain"
                controls={false}
              />
            )}
            {story.type === 'text' && (
              <div
                className="w-full h-full flex items-center justify-center p-4"
                style={{ background: story.background_color || '#8B5CF6' }}
              >
                <p className="text-white text-xl text-center break-words">
                  {story.text_content}
                </p>
              </div>
            )}

            {/* Crédito ao autor original */}
            <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md rounded-lg p-2">
              <div className="flex items-center gap-2">
                {story.profile?.avatar_url ? (
                  <SafeImage
                    src={story.profile.avatar_url}
                    alt={story.profile.username}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">
                    @{story.profile?.username || 'usuario'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mensagem opcional */}
          <div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Adicione uma mensagem (opcional)"
              maxLength={200}
              rows={3}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length}/200 caracteres
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRepost}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Repostando...
                </>
              ) : (
                'Repostar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
