import { useNavigate } from 'react-router-dom';
import { ProfileHoverCard } from '@/components/ProfileHoverCard';
import { StoryIndicator } from '@/components/stories/StoryIndicator';

interface ProfileAvatarWithHoverProps {
  profileId: string;
  username?: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  hoverCardSide?: 'top' | 'right' | 'bottom' | 'left';
  onClick?: () => void;
}

const sizeMap = {
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
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (username) {
      navigate(`/${username}`);
    }
  };

  return (
    <ProfileHoverCard profileId={profileId} side={hoverCardSide}>
      <div className={`inline-block ${className}`}>
        <StoryIndicator
          profileId={profileId}
          avatarUrl={avatarUrl}
          username={username}
          size={sizeMap[size]}
          onClick={handleClick}
        />
      </div>
    </ProfileHoverCard>
  );
}
