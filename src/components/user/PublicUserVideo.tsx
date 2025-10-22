import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video as VideoIcon } from "lucide-react";

interface Video {
  youtube_url: string;
  title: string | null;
}

interface PublicUserVideoProps {
  userId: string;
}

export function PublicUserVideo({ userId }: PublicUserVideoProps) {
  const [video, setVideo] = useState<Video | null>(null);

  useEffect(() => {
    loadVideo();
  }, [userId]);

  const loadVideo = async () => {
    try {
      const { data, error } = await supabase
        .from("user_videos")
        .select("youtube_url, title")
        .eq("profile_id", userId)
        .eq("active", true)
        .maybeSingle();

      if (error) throw error;
      if (data) setVideo(data);
    } catch (error) {
      console.error("Error loading video:", error);
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  if (!video) return null;

  const embedUrl = getYouTubeEmbedUrl(video.youtube_url);
  if (!embedUrl) return null;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-2 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <VideoIcon className="w-5 h-5" />
          {video.title || "Vídeo de Apresentação"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-video rounded-lg overflow-hidden">
          <iframe
            src={embedUrl}
            title={video.title || "Video"}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </CardContent>
    </Card>
  );
}
