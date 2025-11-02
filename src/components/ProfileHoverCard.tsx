import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SafeImage } from '@/components/ui/safe-image';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useProfileHoverData } from '@/hooks/useProfileHoverData';
import { Star, Calendar, User, Eye, Play } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProfileHoverCardProps {
  profileId: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function ProfileHoverCard({ profileId, children, side = 'top' }: ProfileHoverCardProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data, loading, error } = useProfileHoverData(profileId, open);

  const handleViewProfile = () => {
    if (data.profile?.username) {
      navigate(`/${data.profile.username}`);
      setOpen(false);
    }
  };

  const handleViewStories = () => {
    if (data.profile?.username) {
      navigate(`/${data.profile.username}?viewStories=true`);
      setOpen(false);
    }
  };

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        side={side}
        align="center"
        className="w-80 p-0 overflow-hidden"
        sideOffset={8}
      >
        {loading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-24 w-full" />
            <div className="flex flex-col items-center -mt-12">
              <Skeleton className="w-20 h-20 rounded-full" />
              <Skeleton className="h-5 w-32 mt-3" />
              <Skeleton className="h-4 w-24 mt-1" />
            </div>
            <div className="space-y-2 mt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-muted-foreground">
            {error}
          </div>
        ) : data.profile ? (
          <div className="relative">
            {/* Cover Photo */}
            <div className="h-24 relative overflow-hidden">
              {data.profile.cover_thumbnail_url || data.profile.cover_url ? (
                <SafeImage
                  src={data.profile.cover_thumbnail_url || data.profile.cover_url || ''}
                  alt="Capa do perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
            </div>

            {/* Avatar with Story Border */}
            <div className="flex flex-col items-center -mt-12 px-6">
              <div className={data.story ? 'p-[3px] bg-gradient-to-tr from-orange via-purple-500 to-pink-500 rounded-full' : ''}>
                <Avatar className="w-20 h-20 border-4 border-background">
                  {data.profile.avatar_thumbnail_url || data.profile.avatar_url ? (
                    <SafeImage
                      src={data.profile.avatar_thumbnail_url || data.profile.avatar_url || ''}
                      alt={data.profile.full_name || data.profile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <AvatarFallback>
                      <User className="w-8 h-8" />
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>

              {/* User Info */}
              <div className="text-center mt-3 space-y-1">
                <h3 className="font-semibold text-lg leading-none">
                  {data.profile.profile_type === 'business' 
                    ? data.profile.company_name 
                    : data.profile.full_name || data.profile.username}
                </h3>
                <p className="text-sm text-muted-foreground">
                  @{data.profile.username}
                </p>
              </div>

              {/* Stats */}
              <div className="w-full mt-4 space-y-2">
                {data.profile.total_reviews !== null && data.profile.total_reviews !== undefined && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((starIndex) => {
                        const rating = data.profile.average_rating || 0;
                        const isFilled = starIndex <= Math.round(rating);
                        return (
                          <Star
                            key={starIndex}
                            className={`w-4 h-4 ${
                              isFilled
                                ? 'fill-orange text-orange'
                                : 'fill-muted text-muted stroke-muted-foreground'
                            }`}
                          />
                        );
                      })}
                      <span className="font-semibold text-sm ml-1">
                        {data.profile.average_rating?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                    {data.profile.total_reviews > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {data.profile.total_reviews} {data.profile.total_reviews === 1 ? 'avaliação' : 'avaliações'}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Está no Woorkins desde {format(new Date(data.profile.created_at), 'MMM yyyy', { locale: ptBR })}
                  </span>
                </div>
              </div>

              {/* Story Preview */}
              {data.story && (
                <div className="w-full mt-3 rounded-lg overflow-hidden">
                  <SafeImage
                    src={data.story.thumbnail_url || ''}
                    alt="Preview do story"
                    className="w-full h-20 object-cover"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="w-full flex gap-2 mt-4 mb-4">
                <Button
                  onClick={handleViewProfile}
                  className="flex-1"
                  size="sm"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver Perfil
                </Button>
                {data.story && (
                  <Button
                    onClick={handleViewStories}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Ver Stories
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}
