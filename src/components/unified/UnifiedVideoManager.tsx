import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VideoData {
  id: string;
  youtube_url: string;
  title?: string;
  active: boolean;
}

interface UnifiedVideoManagerProps {
  profileId: string;
}

export function UnifiedVideoManager({ profileId }: UnifiedVideoManagerProps) {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadVideo();
  }, [profileId]);

  const loadVideo = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_videos')
        .select('*')
        .eq('target_profile_id', profileId)
        .eq('active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const videoData = data as any;
        setVideo(videoData);
        setYoutubeUrl(videoData.youtube_url);
        setTitle(videoData.title || "");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar vídeo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleSaveVideo = async () => {
    const videoId = extractYoutubeId(youtubeUrl);
    if (!videoId) {
      toast({
        title: "Erro",
        description: "URL do YouTube inválida",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const videoData = {
        youtube_url: youtubeUrl,
        title: title || null,
        target_profile_id: profileId,
        active: true,
      };

      if (video?.id) {
        const { error } = await supabase
          .from('profile_videos')
          .update(videoData)
          .eq('id', video.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profile_videos')
          .insert([videoData]);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Vídeo salvo com sucesso!",
      });

      loadVideo();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar vídeo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!video || !confirm("Tem certeza que deseja excluir este vídeo?")) return;

    try {
      const { error } = await supabase
        .from('profile_videos')
        .delete()
        .eq('id', video.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Vídeo excluído com sucesso!",
      });

      setVideo(null);
      setYoutubeUrl("");
      setTitle("");
    } catch (error: any) {
      toast({
        title: "Erro ao excluir vídeo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const videoId = extractYoutubeId(youtubeUrl);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Vídeo de Apresentação</h3>

      <div className="space-y-4">
        <Input
          placeholder="URL do YouTube (ex: https://youtube.com/watch?v=...)"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
        />

        <Input
          placeholder="Título do vídeo (opcional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {videoId && (
          <div className="aspect-video">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSaveVideo} disabled={loading}>
            Salvar Vídeo
          </Button>
          {video && (
            <Button variant="destructive" onClick={handleDeleteVideo}>
              Excluir Vídeo
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
