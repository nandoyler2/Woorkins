import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useFollow(targetProfileId: string) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followerProfileId, setFollowerProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadFollowerProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (followerProfileId && targetProfileId) {
      checkFollowStatus();
    }
  }, [followerProfileId, targetProfileId]);

  const loadFollowerProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setFollowerProfileId(data.id);
    }
  };

  const checkFollowStatus = async () => {
    if (!followerProfileId || !targetProfileId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerProfileId)
      .eq('following_id', targetProfileId)
      .maybeSingle();

    if (!error) {
      setIsFollowing(!!data);
    }
    setLoading(false);
  };

  const toggleFollow = async () => {
    if (!followerProfileId || !targetProfileId) return false;

    try {
      if (isFollowing) {
        // Deixar de seguir
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', followerProfileId)
          .eq('following_id', targetProfileId);

        if (error) throw error;
        setIsFollowing(false);
        return false;
      } else {
        // Seguir
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: followerProfileId,
            following_id: targetProfileId,
          });

        if (error) throw error;
        setIsFollowing(true);
        return true;
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      return null;
    }
  };

  return {
    isFollowing,
    loading,
    toggleFollow,
    followerProfileId,
  };
}
