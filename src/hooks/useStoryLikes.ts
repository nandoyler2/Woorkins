import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useStoryLikes = (storyId: string | null) => {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Buscar profile_id do usuário
  useEffect(() => {
    if (!user?.id) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (data) setProfileId(data.id);
    };

    fetchProfile();
  }, [user?.id]);

  useEffect(() => {
    if (!storyId) return;

    const fetchLikeStatus = async () => {
      try {
        // Buscar contador de curtidas
        const { data: storyData } = await supabase
          .from('profile_stories')
          .select('like_count')
          .eq('id', storyId)
          .single();

        if (storyData) {
          setLikeCount(storyData.like_count || 0);
        }

        // Verificar se usuário curtiu
        if (profileId) {
          const { data } = await supabase
            .from('story_likes')
            .select('id')
            .eq('story_id', storyId)
            .eq('profile_id', profileId)
            .single();

          setIsLiked(!!data);
        }
      } catch (error) {
        console.error('Erro ao verificar curtidas:', error);
      }
    };

    fetchLikeStatus();
  }, [storyId, profileId]);

  const toggleLike = async () => {
    if (!storyId || !profileId || loading) return;

    setLoading(true);
    try {
      if (isLiked) {
        // Remover curtida
        await supabase
          .from('story_likes')
          .delete()
          .eq('story_id', storyId)
          .eq('profile_id', profileId);

        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        // Adicionar curtida
        await supabase
          .from('story_likes')
          .insert({
            story_id: storyId,
            profile_id: profileId
          });

        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Erro ao curtir story:', error);
    } finally {
      setLoading(false);
    }
  };

  return { isLiked, likeCount, toggleLike, loading };
};
