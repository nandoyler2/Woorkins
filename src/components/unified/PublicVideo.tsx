import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';

interface Video {
  youtube_url: string;
  title?: string;
}

interface PublicVideoProps {
  entityType: 'user' | 'business';
  entityId: string;
}

export function PublicVideo({ entityType, entityId }: PublicVideoProps) {
  const [video, setVideo] = useState<Video | null>(null);

  useEffect(() => {
    loadVideo();
  }, [entityId, entityType]);

  const loadVideo = async () => {
    const tableName = entityType === 'user' ? 'user_videos' : 'business_videos';
    const idColumn = entityType === 'user' ? 'profile_id' : 'business_id';

    const { data } = await supabase
      .from(tableName as any)
      .select('youtube_url, title')
      .eq(idColumn, entityId)
      .eq('active', true)
      .maybeSingle();

    setVideo(data as unknown as Video | null);
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  if (!video) return null;

  const videoId = extractYoutubeId(video.youtube_url);
  if (!videoId) return null;

  return (
    <Card className="overflow-hidden mb-6 bg-gradient-to-br from-red-500/10 to-red-600/5 border-l-4 border-l-red-500 shadow-2xl hover:shadow-red-500/20 transition-all duration-300 backdrop-blur-sm">
      {video.title && (
        <div className="p-4 bg-gradient-to-r from-red-500/10 to-red-600/5">
          <h3 className="font-semibold flex items-center gap-2">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            {video.title}
          </h3>
        </div>
      )}
      <div className="aspect-video p-2">
        <iframe
          className="w-full h-full border-4 border-primary/10 rounded-lg"
          src={`https://www.youtube.com/embed/${videoId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </Card>
  );
}
