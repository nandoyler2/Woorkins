import { useNavigate } from 'react-router-dom';
import { ProfileAvatarWithHover } from '@/components/ProfileAvatarWithHover';
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
  const navigate = useNavigate();

  const handleClick = () => {
    if (username) {
      navigate(`/${username}`);
    }
  };

  const displayName = formatShortName(fullName) || username || 'Usuário';

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
    >
      {showAvatar && (
        <ProfileAvatarWithHover
          profileId={profileId}
          username={username}
          avatarUrl={avatarUrl}
          size={avatarSize}
          onClick={handleClick}
        />
      )}
      {showName && (
        <span 
          onClick={handleClick}
          className={`hover:underline cursor-pointer ${nameClassName}`}
        >
          {displayName}
        </span>
      )}
    </div>
  );
}
