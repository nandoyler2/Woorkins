import { useState, useEffect, useRef } from 'react';
import { Heart, Send, MessageCircle, Repeat2, X, CornerUpLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatShortName } from '@/lib/utils';

interface StoryComment {
  id: string;
  profile_id: string;
  comment_text: string;
  created_at: string;
  parent_comment_id?: string | null;
  like_count: number;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  isLikedByUser?: boolean;
  replies?: StoryComment[];
}

interface StoryCommentSectionProps {
  storyId: string;
  currentProfileId: string;
  isLiked: boolean;
  onToggleLike: () => void;
  isOwner: boolean;
  onRepost?: () => void;
  onCommentsToggle?: (isOpen: boolean) => void;
}

export function StoryCommentSection({ storyId, currentProfileId, isLiked, onToggleLike, isOwner, onRepost, onCommentsToggle }: StoryCommentSectionProps) {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [recentComments, setRecentComments] = useState<StoryComment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [showAllComments, setShowAllComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
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
          event: '*',
          schema: 'public',
          table: 'story_comments',
          filter: `story_id=eq.${storyId}`,
        },
        () => {
          loadComments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'story_comment_likes',
        },
        () => {
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
        .select('id, story_id, profile_id, comment_text, created_at, parent_comment_id, like_count')
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

        // Verificar quais comentários o usuário curtiu
        const { data: userLikes } = await supabase
          .from('story_comment_likes')
          .select('comment_id')
          .eq('profile_id', currentProfileId)
          .in('comment_id', commentsData.map(c => c.id));

        const likedCommentIds = new Set(userLikes?.map(l => l.comment_id) || []);

        const formattedComments = (commentsData || []).map((comment) => ({
          id: comment.id,
          profile_id: comment.profile_id,
          comment_text: comment.comment_text,
          created_at: comment.created_at,
          parent_comment_id: comment.parent_comment_id,
          like_count: comment.like_count || 0,
          profiles: profilesMap.get(comment.profile_id) || { username: '', full_name: '', avatar_url: null },
          isLikedByUser: likedCommentIds.has(comment.id),
        }));

        // Separar comentários principais e respostas
        const mainComments = formattedComments.filter(c => !c.parent_comment_id);
        const replies = formattedComments.filter(c => c.parent_comment_id);
        
        // Organizar respostas por comentário pai
        const commentsWithReplies = mainComments.map(comment => ({
          ...comment,
          replies: replies.filter(r => r.parent_comment_id === comment.id)
        }));

        setComments(commentsWithReplies);
        setCommentCount(mainComments.length);
      } else {
        setComments([]);
        setCommentCount(0);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleToggleCommentLike = async (commentId: string, isLiked: boolean) => {
    if (!currentProfileId) return;

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('story_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('profile_id', currentProfileId);
      } else {
        // Like
        await supabase
          .from('story_comment_likes')
          .insert({
            comment_id: commentId,
            profile_id: currentProfileId,
          });
      }

      // Atualizar estado local
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            isLikedByUser: !isLiked,
            like_count: isLiked ? Math.max(0, c.like_count - 1) : c.like_count + 1,
          };
        }
        return c;
      }));
    } catch (error) {
      console.error('Error toggling comment like:', error);
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
          parent_comment_id: replyingTo,
        })
        .select('id, story_id, profile_id, comment_text, created_at, parent_comment_id, like_count')
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
        parent_comment_id: data.parent_comment_id,
        like_count: 0,
        profiles: profileData || { username: '', full_name: '', avatar_url: null },
        isLikedByUser: false,
      };

      // Adicionar aos comentários recentes (aparece temporariamente)
      if (!replyingTo) {
        setRecentComments(prev => [newComment, ...prev]);
        
        // Remover dos recentes após 3 segundos
        setTimeout(() => {
          setRecentComments(prev => prev.filter(c => c.id !== newComment.id));
        }, 3000);
      }

      setCommentText('');
      setReplyingTo(null);
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

  const toggleComments = () => {
    const newState = !showAllComments;
    setShowAllComments(newState);
    onCommentsToggle?.(newState);
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyingTo(commentId);
    setReplyText(prev => ({ ...prev, [commentId]: `@${username} ` }));
  };

  const cancelReply = (commentId: string) => {
    setReplyingTo(null);
    setReplyText(prev => {
      const newState = { ...prev };
      delete newState[commentId];
      return newState;
    });
  };

  const handleSendReply = async (commentId: string) => {
    const text = replyText[commentId]?.trim();
    if (!text || isSubmitting || !currentProfileId) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('story_comments')
        .insert({
          story_id: storyId,
          profile_id: currentProfileId,
          comment_text: text,
          parent_comment_id: commentId,
        })
        .select('id, story_id, profile_id, comment_text, created_at, parent_comment_id, like_count')
        .single();

      if (error) throw error;

      cancelReply(commentId);
      loadComments();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: 'Erro ao enviar resposta',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Sombra degradê inferior para melhor visibilidade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 z-20 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />

      {/* Comentários recentes flutuantes */}
      {!showAllComments && (
        <div className="absolute bottom-24 left-4 right-4 z-30 space-y-2 pointer-events-none">
          {recentComments.slice(0, 3).map((comment, index) => (
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
      )}

      {/* Tela de comentários expandida */}
      {showAllComments && (
        <div className="absolute inset-0 bg-black/95 z-40 flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-white font-semibold text-lg">Comentários ({commentCount})</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleComments}
              className="text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <ScrollArea className="flex-1 px-4 py-6">
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="animate-fade-in">
                  {/* Comentário principal */}
                  <div className="flex gap-3">
                    <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-white/20">
                      <AvatarImage src={comment.profiles.avatar_url || undefined} />
                      <AvatarFallback className="bg-white/10 text-white font-semibold">
                        {formatShortName(comment.profiles.full_name)?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <p className="text-sm font-semibold text-white">
                          {formatShortName(comment.profiles.full_name) || comment.profiles.username}
                        </p>
                        <p className="text-xs text-white/60">
                          {new Date(comment.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <p className="text-sm text-white/90 break-words leading-relaxed mb-2">
                        {comment.comment_text}
                      </p>
                      
                      {/* Ações do comentário */}
                      <div className="flex items-center gap-4 text-white/70">
                        <button
                          onClick={() => handleToggleCommentLike(comment.id, comment.isLikedByUser || false)}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${comment.isLikedByUser ? 'fill-red-500 text-red-500' : ''}`} />
                          {comment.like_count > 0 && (
                            <span className="text-xs font-medium">{comment.like_count}</span>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleReply(comment.id, comment.profiles.username)}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          <CornerUpLeft className="w-4 h-4" />
                          <span className="text-xs font-medium">Responder</span>
                        </button>
                      </div>

                      {/* Campo de resposta inline */}
                      {replyingTo === comment.id && (
                        <div className="mt-3 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                          <Input
                            value={replyText[comment.id] || ''}
                            onChange={(e) => setReplyText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply(comment.id);
                              }
                            }}
                            placeholder="Escrever resposta..."
                            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-full text-sm h-9 focus:border-white/40 focus-visible:ring-0"
                            maxLength={200}
                            disabled={isSubmitting}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSendReply(comment.id)}
                            disabled={isSubmitting || !replyText[comment.id]?.trim()}
                            className="rounded-full h-9 px-4 bg-white text-black hover:bg-white/90"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelReply(comment.id)}
                            className="rounded-full h-9 w-9 p-0 text-white/70 hover:text-white hover:bg-white/10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {/* Respostas aninhadas */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-4 ml-6 space-y-4 border-l-2 border-white/10 pl-4">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex gap-2">
                              <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-white/20">
                                <AvatarImage src={reply.profiles.avatar_url || undefined} />
                                <AvatarFallback className="bg-white/10 text-white text-xs font-semibold">
                                  {formatShortName(reply.profiles.full_name)?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                  <p className="text-xs font-semibold text-white">
                                    {formatShortName(reply.profiles.full_name) || reply.profiles.username}
                                  </p>
                                  <p className="text-[10px] text-white/60">
                                    {new Date(reply.created_at).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                                <p className="text-xs text-white/90 break-words leading-relaxed mb-1">
                                  {reply.comment_text}
                                </p>
                                
                                {/* Ações da resposta */}
                                <div className="flex items-center gap-3 text-white/70">
                                  <button
                                    onClick={() => handleToggleCommentLike(reply.id, reply.isLikedByUser || false)}
                                    className="flex items-center gap-1 hover:text-white transition-colors"
                                  >
                                    <Heart className={`w-3 h-3 ${reply.isLikedByUser ? 'fill-red-500 text-red-500' : ''}`} />
                                    {reply.like_count > 0 && (
                                      <span className="text-[10px] font-medium">{reply.like_count}</span>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Barra de comentários inferior */}
      <div className="absolute bottom-4 left-4 right-4 z-30">
        <div className="flex items-center gap-3">
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
            {commentCount > 0 && !showAllComments && (
              <button 
                onClick={toggleComments}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-white/80 hover:text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs font-semibold">{commentCount}</span>
              </button>
            )}
          </div>

          {/* Botão de curtir */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleLike}
            className="bg-transparent border-0 text-white hover:bg-transparent hover:scale-110 transition-transform rounded-full h-10 w-10 flex-shrink-0"
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>

          {/* Botão de repost - sempre visível, desabilitado se for dono */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRepost}
            disabled={isOwner}
            className="bg-transparent border-0 text-white hover:bg-transparent hover:scale-110 transition-transform rounded-full h-10 w-10 flex-shrink-0 disabled:opacity-30 disabled:hover:scale-100"
          >
            <Repeat2 className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </>
  );
}