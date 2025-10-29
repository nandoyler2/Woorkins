import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SafeImage } from '@/components/ui/safe-image';
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StoryIndicatorProps {
  profileId: string;
  avatarUrl?: string | null;
  username?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export function StoryIndicator({
  profileId,
  avatarUrl,
  username,
  size = 'md',
  onClick,
  className = '',
}: StoryIndicatorProps) {
  const [hasActiveStories, setHasActiveStories] = useState(false);
  const [latestStoryPreview, setLatestStoryPreview] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const paddingClasses = {
    sm: 'p-0.5',
    md: 'p-[3px]',
    lg: 'p-1',
  };

  useEffect(() => {
    checkActiveStories();

    // Subscribe to changes
    const channel = supabase
      .channel(`stories-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_stories',
          filter: `profile_id=eq.${profileId}`,
        },
        () => {
          checkActiveStories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  const checkActiveStories = async () => {
    try {
      const { data, count } = await supabase
        .from('profile_stories')
        .select('media_url, type', { count: 'exact' })
        .eq('profile_id', profileId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      setHasActiveStories((count || 0) > 0);
      
      // Se tem stories e é uma imagem, usar como preview
      if (data && data.length > 0 && data[0].type === 'image' && data[0].media_url) {
        setLatestStoryPreview(data[0].media_url);
      } else {
        setLatestStoryPreview(null);
      }
    } catch (error) {
      console.error('Error checking stories:', error);
    }
  };

  return (
    <div
      className={`${sizeClasses[size]} ${
        hasActiveStories
          ? 'bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500'
          : 'bg-border'
      } rounded-full ${paddingClasses[size]} ${onClick ? 'cursor-pointer' : 'cursor-default'} transition-transform ${className}`}
      onClick={onClick}
      title={hasActiveStories ? 'Ver stories' : username}
    >
      <div className="w-full h-full bg-background rounded-full p-[2px]">
        <Avatar className="w-full h-full">
          {latestStoryPreview && hasActiveStories ? (
            <SafeImage
              src={latestStoryPreview}
              alt={username || 'Story preview'}
              className="w-full h-full object-cover"
            />
          ) : avatarUrl ? (
            <SafeImage
              src={avatarUrl}
              alt={username || 'Avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            <AvatarFallback>
              <User className="w-1/2 h-1/2" />
            </AvatarFallback>
          )}
        </Avatar>
      </div>
    </div>
  );
}
