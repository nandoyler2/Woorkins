import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

interface Video {
  youtube_url: string;
  title?: string;
}

interface PublicBusinessVideoProps {
  businessId: string;
}

export function PublicBusinessVideo({ businessId }: PublicBusinessVideoProps) {
  const [video, setVideo] = useState<Video | null>(null);

  useEffect(() => {
    loadVideo();
  }, [businessId]);

  const loadVideo = async () => {
    const { data } = await supabase
      .from("business_videos")
      .select("youtube_url, title")
      .eq("business_id", businessId)
      .eq("active", true)
      .maybeSingle();

    setVideo(data);
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
    <Card className="overflow-hidden mb-6">
      {video.title && (
        <div className="p-4 bg-muted">
          <h3 className="font-semibold">{video.title}</h3>
        </div>
      )}
      <div className="aspect-video">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </Card>
  );
}
