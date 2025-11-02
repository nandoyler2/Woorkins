import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileHoverData {
  id: string;
  username: string;
  full_name: string | null;
  company_name: string | null;
  profile_type: string;
  avatar_url: string | null;
  avatar_thumbnail_url: string | null;
  cover_url: string | null;
  cover_thumbnail_url: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  created_at: string;
}

interface StoryData {
  id: string;
  thumbnail_url: string | null;
  type: string;
  created_at: string;
}

interface CachedData {
  profile: ProfileHoverData;
  stories: StoryData[];
  timestamp: number;
}

const cache = new Map<string, CachedData>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useProfileHoverData(profileId: string, enabled: boolean) {
  const [data, setData] = useState<{ profile: ProfileHoverData | null; stories: StoryData[] }>({
    profile: null,
    stories: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !profileId) return;

    const loadData = async () => {
      // Check cache first
      const cached = cache.get(profileId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setData({ profile: cached.profile, stories: cached.stories });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            username,
            full_name,
            company_name,
            profile_type,
            avatar_url,
            avatar_thumbnail_url,
            cover_url,
            cover_thumbnail_url,
            average_rating,
            total_reviews,
            created_at
          `)
          .eq('id', profileId)
          .single();

        if (profileError) throw profileError;

        // Fetch all active stories (ordered by most recent first)
        const { data: activeStories } = await supabase
          .from('profile_stories')
          .select('id, thumbnail_url, type, created_at')
          .eq('profile_id', profileId)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        const storiesData = activeStories || [];

        // Update cache
        cache.set(profileId, {
          profile: profileData,
          stories: storiesData,
          timestamp: Date.now(),
        });

        setData({ profile: profileData, stories: storiesData });
      } catch (err) {
        console.error('Error loading profile hover data:', err);
        setError('Não foi possível carregar os dados do perfil');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [profileId, enabled]);

  return { data, loading, error };
}
