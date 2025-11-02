import { useRef } from 'react';
import { ProfileHoverCard, ProfileHoverCardRef } from '@/components/ProfileHoverCard';
import { StoryIndicator } from '@/components/stories/StoryIndicator';

interface ProfileAvatarWithHoverProps {
  profileId: string;
  username?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  hoverCardSide?: 'top' | 'right' | 'bottom' | 'left';
  onClick?: () => void;
}

const sizeMap = {
  xs: 'xs' as const,
  sm: 'sm' as const,
  md: 'md' as const,
  lg: 'lg' as const,
};

export function ProfileAvatarWithHover({
  profileId,
  username,
  avatarUrl,
  size = 'md',
  className = '',
  hoverCardSide = 'top',
  onClick,
}: ProfileAvatarWithHoverProps) {
  const hoverCardRef = useRef<ProfileHoverCardRef>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      hoverCardRef.current?.openCard();
    }
  };

  return (
    <ProfileHoverCard ref={hoverCardRef} profileId={profileId} side={hoverCardSide}>
      <div className={`inline-block ${className}`}>
        <StoryIndicator
          profileId={profileId}
          avatarUrl={avatarUrl}
          username={username}
          size={sizeMap[size]}
          onClick={() => handleClick({} as React.MouseEvent)}
        />
      </div>
    </ProfileHoverCard>
  );
}
