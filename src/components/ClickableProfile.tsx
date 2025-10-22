import { useNavigate } from 'react-router-dom';
import { SafeImage } from '@/components/ui/safe-image';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';

interface ClickableProfileProps {
  profileId: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string | null;
  showAvatar?: boolean;
  showName?: boolean;
  avatarSize?: 'sm' | 'md' | 'lg';
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

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const displayName = fullName || username || 'Usuário';

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
    >
      {showAvatar && (
        <Avatar className={sizeClasses[avatarSize]}>
          {avatarUrl ? (
            <SafeImage
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <AvatarFallback>
              <User className="w-4 h-4" />
            </AvatarFallback>
          )}
        </Avatar>
      )}
      {showName && (
        <span className={`hover:underline ${nameClassName}`}>
          {displayName}
        </span>
      )}
    </div>
  );
}
