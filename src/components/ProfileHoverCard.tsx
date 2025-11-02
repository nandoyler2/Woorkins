import { useState, useRef, useEffect } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SafeImage } from '@/components/ui/safe-image';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useProfileHoverData } from '@/hooks/useProfileHoverData';
import { StoriesViewer } from '@/components/stories/StoriesViewer';
import { Star, Calendar, User, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatShortName } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileHoverCardProps {
  profileId: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function ProfileHoverCard({ profileId, children, side = 'top' }: ProfileHoverCardProps) {
  const [open, setOpen] = useState(false);
  const [showStoriesViewer, setShowStoriesViewer] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const storiesScrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { data, loading, error } = useProfileHoverData(profileId, open);

  // Check scroll buttons when stories load
  useEffect(() => {
    if (data.stories.length > 0) {
      setTimeout(checkScrollButtons, 100);
    }
  }, [data.stories]);

  const handleViewProfile = () => {
    if (data.profile?.username) {
      window.open(`/${data.profile.username}`, '_blank');
    }
  };

  const handleViewStories = () => {
    setShowStoriesViewer(true);
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleViewProfile();
  };

  const checkScrollButtons = () => {
    if (storiesScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = storiesScrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollStories = (direction: 'left' | 'right') => {
    if (storiesScrollRef.current) {
      const scrollAmount = 150;
      const newScrollLeft = direction === 'left' 
        ? storiesScrollRef.current.scrollLeft - scrollAmount
        : storiesScrollRef.current.scrollLeft + scrollAmount;
      
      storiesScrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
      
      setTimeout(checkScrollButtons, 300);
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
            <div className="flex flex-col items-center -mt-12 px-6 relative z-10">
              <div 
                className={`${data.stories.length > 0 ? 'p-[3px] bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 rounded-full cursor-pointer' : ''}`}
                onClick={data.stories.length > 0 ? handleViewStories : undefined}
              >
                <Avatar 
                  className="w-20 h-20 border-4 border-background cursor-pointer"
                  onClick={handleProfileClick}
                >
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
                <div className="flex items-center justify-center gap-2">
                  <h3 
                    className="font-semibold text-lg leading-none cursor-pointer hover:underline"
                    onClick={handleProfileClick}
                  >
                    {formatShortName(
                      data.profile.profile_type === 'business' 
                        ? data.profile.company_name 
                        : data.profile.full_name
                    ) || data.profile.username}
                  </h3>
                  <ExternalLink 
                    className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors" 
                    onClick={handleProfileClick}
                  />
                </div>
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
                        const rating = data.profile.average_rating || 5.0;
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
                        {data.profile.average_rating?.toFixed(1) || '5.0'}
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

              {/* Stories Miniatures - Sempre mostra os mais recentes primeiro */}
              {data.stories.length > 0 && (
                <div className="w-full mt-3 relative">
                  {data.stories.length > 3 && canScrollLeft && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/90 backdrop-blur-sm hover:bg-background shadow-md"
                      onClick={() => scrollStories('left')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <div 
                    ref={storiesScrollRef}
                    className={`flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide ${data.stories.length > 3 ? 'px-8' : 'px-2 justify-center'}`}
                    onScroll={checkScrollButtons}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {data.stories.map((story) => (
                      <div
                        key={story.id}
                        className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleViewStories}
                      >
                        <div className="p-[2px] bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 rounded-lg">
                          <div className="w-14 h-20 rounded-md overflow-hidden bg-background">
                            <SafeImage
                              src={story.thumbnail_url || ''}
                              alt="Story"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {data.stories.length > 3 && canScrollRight && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/90 backdrop-blur-sm hover:bg-background shadow-md"
                      onClick={() => scrollStories('right')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
              
              {/* Bottom Spacing */}
              <div className="mb-4" />
            </div>
          </div>
        ) : null}
      </HoverCardContent>
      
      {/* Stories Viewer */}
      {showStoriesViewer && data.profile && (
        <StoriesViewer
          profileId={profileId}
          isOpen={showStoriesViewer}
          onClose={() => setShowStoriesViewer(false)}
          currentProfileId={user?.id || ''}
          onStoryDeleted={() => {}}
        />
      )}
    </HoverCard>
  );
}
