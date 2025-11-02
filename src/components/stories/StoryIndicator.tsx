import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SafeImage } from '@/components/ui/safe-image';
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StoryIndicatorProps {
  profileId: string;
  avatarUrl?: string | null;
  username?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
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

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const paddingClasses = {
    xs: 'p-[2px]',
    sm: 'p-[2px]',
    md: 'p-[3px]',
    lg: 'p-[4px]',
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
      const { count } = await supabase
        .from('profile_stories')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .gt('expires_at', new Date().toISOString());

      setHasActiveStories((count || 0) > 0);
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
          {avatarUrl ? (
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
