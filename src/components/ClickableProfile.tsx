import { useRef } from 'react';
import { StoryIndicator } from '@/components/stories/StoryIndicator';
import { ProfileHoverCard, ProfileHoverCardRef } from '@/components/ProfileHoverCard';
import { formatShortName } from '@/lib/utils';

interface ClickableProfileProps {
  profileId: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string | null;
  showAvatar?: boolean;
  showName?: boolean;
  avatarSize?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  nameClassName?: string;
}

export function ClickableProfile({
  profileId,
  username,
  fullName,
  avatarUrl,
  showAvatar = true,
  showName = true,
  avatarSize = 'md',
  className = '',
  nameClassName = '',
}: ClickableProfileProps) {
  const hoverCardRef = useRef<ProfileHoverCardRef>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hoverCardRef.current?.openCard();
  };

  const displayName = formatShortName(fullName) || username || 'Usuário';

  return (
    <ProfileHoverCard ref={hoverCardRef} profileId={profileId}>
      <div
        className={`flex items-center gap-2 cursor-pointer ${className}`}
        onClick={handleClick}
      >
        {showAvatar && (
          <StoryIndicator
            profileId={profileId}
            username={username}
            avatarUrl={avatarUrl}
            size={avatarSize}
            onClick={() => handleClick({} as React.MouseEvent)}
          />
        )}
        {showName && (
          <span 
            className={`hover:underline ${nameClassName}`}
          >
            {displayName}
          </span>
        )}
      </div>
    </ProfileHoverCard>
  );
}
