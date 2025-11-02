import { useState, useEffect, useRef } from 'react';
import { Heart, Send, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { formatShortName } from '@/lib/utils';

interface StoryComment {
  id: string;
  profile_id: string;
  comment_text: string;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface StoryCommentSectionProps {
  storyId: string;
  currentProfileId: string;
  isLiked: boolean;
  onToggleLike: () => void;
}

export function StoryCommentSection({ storyId, currentProfileId, isLiked, onToggleLike }: StoryCommentSectionProps) {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [recentComments, setRecentComments] = useState<StoryComment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadComments();

    // Realtime updates
    const channel = supabase
      .channel(`story-comments-${storyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'story_comments',
          filter: `story_id=eq.${storyId}`,
        },
        (payload) => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storyId]);

  const loadComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from('story_comments')
        .select('id, story_id, profile_id, comment_text, created_at')
        .eq('story_id', storyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar profiles dos comentários
      const profileIds = [...new Set(commentsData?.map(c => c.profile_id) || [])];
      
      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', profileIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        const formattedComments = (commentsData || []).map((comment) => ({
          id: comment.id,
          profile_id: comment.profile_id,
          comment_text: comment.comment_text,
          created_at: comment.created_at,
          profiles: profilesMap.get(comment.profile_id) || { username: '', full_name: '', avatar_url: null },
        }));

        setComments(formattedComments);
        setCommentCount(formattedComments.length);
      } else {
        setComments([]);
        setCommentCount(0);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || isSubmitting || !currentProfileId) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('story_comments')
        .insert({
          story_id: storyId,
          profile_id: currentProfileId,
          comment_text: commentText.trim(),
        })
        .select('id, story_id, profile_id, comment_text, created_at')
        .single();

      if (error) {
        console.error('Error inserting comment:', error);
        throw error;
      }

      // Buscar dados do profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', currentProfileId)
        .single();

      const newComment: StoryComment = {
        id: data.id,
        profile_id: data.profile_id,
        comment_text: data.comment_text,
        created_at: data.created_at,
        profiles: profileData || { username: '', full_name: '', avatar_url: null },
      };

      // Adicionar aos comentários recentes (aparece temporariamente)
      setRecentComments(prev => [newComment, ...prev]);
      
      // Remover dos recentes após 3 segundos
      setTimeout(() => {
        setRecentComments(prev => prev.filter(c => c.id !== newComment.id));
      }, 3000);

      setCommentText('');
    } catch (error) {
      console.error('Error sending comment:', error);
      toast({
        title: 'Erro ao enviar comentário',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  return (
    <>
      {/* Sombra degradê inferior para melhor visibilidade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 z-20 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />

      {/* Comentários recentes flutuantes */}
      <div className="absolute bottom-24 left-4 right-4 z-30 space-y-2 pointer-events-none">
        {recentComments.map((comment, index) => (
          <div
            key={comment.id}
            className="bg-black/60 backdrop-blur-md rounded-2xl p-3 animate-in slide-in-from-bottom-4 fade-in duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-2">
              <Avatar className="w-6 h-6 flex-shrink-0">
                <AvatarImage src={comment.profiles.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {formatShortName(comment.profiles.full_name)?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold">
                  {formatShortName(comment.profiles.full_name) || comment.profiles.username}
                </p>
                <p className="text-white/90 text-sm break-words">
                  {comment.comment_text}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Barra de comentários inferior */}
      <div className="absolute bottom-4 left-4 right-4 z-30 flex items-center gap-3">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Comentar..."
            className="bg-transparent border-2 border-white/60 text-white placeholder:text-white/70 rounded-full pr-12 h-12 focus:border-white focus-visible:ring-0 focus-visible:ring-offset-0"
            maxLength={200}
            disabled={isSubmitting}
          />
          
          {/* Contador de comentários dentro do input */}
          {commentCount > 0 && (
            <Sheet>
              <SheetTrigger asChild>
                <button className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-white/80 hover:text-white transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold">{commentCount}</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh]">
                <SheetHeader>
                  <SheetTitle>Comentários ({commentCount})</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4 overflow-y-auto h-[calc(100%-60px)]">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src={comment.profiles.avatar_url || undefined} />
                        <AvatarFallback>
                          {formatShortName(comment.profiles.full_name)?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm font-semibold">
                            {formatShortName(comment.profiles.full_name) || comment.profiles.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <p className="text-sm text-foreground break-words">
                          {comment.comment_text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Botão de curtir */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleLike}
          className="bg-transparent border-0 text-white hover:bg-transparent hover:scale-110 transition-transform rounded-full h-12 w-12 flex-shrink-0"
        >
          <Heart className={`w-7 h-7 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
        </Button>

        {/* Botão de enviar */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSendComment}
          disabled={!commentText.trim() || isSubmitting}
          className="bg-transparent border-0 text-white hover:bg-transparent hover:scale-110 transition-transform rounded-full h-12 w-12 flex-shrink-0 disabled:opacity-30"
        >
          <Send className="w-7 h-7" />
        </Button>
      </div>
    </>
  );
}