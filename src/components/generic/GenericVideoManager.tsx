import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Video } from "lucide-react";

interface VideoData {
  id: string;
  youtube_url: string;
  title?: string;
  active: boolean;
}

interface GenericVideoManagerProps {
  profileId: string;
}

export function GenericVideoManager({ profileId }: GenericVideoManagerProps) {
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
        .select("*")
        .eq('target_profile_id', profileId)
        .eq("active", true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setVideo(data as any);
        setYoutubeUrl((data as any).youtube_url);
        setTitle((data as any).title || "");
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
    if (!youtubeUrl) {
      toast({
        title: "Erro",
        description: "Por favor, insira uma URL do YouTube",
        variant: "destructive",
      });
      return;
    }

    const videoId = extractYoutubeId(youtubeUrl);
    if (!videoId) {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida do YouTube",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const videoData = {
        target_profile_id: profileId,
        youtube_url: youtubeUrl,
        title: title || null,
        active: true,
      };

      if (video?.id) {
        const { error } = await supabase
          .from('profile_videos')
          .update(videoData)
          .eq("id", video.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profile_videos')
          .insert(videoData as any);
        if (error) throw error;
      }

      toast({
        title: "Vídeo salvo",
        description: "Vídeo atualizado com sucesso",
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
    if (!video?.id) return;
    if (!confirm("Deseja realmente remover este vídeo?")) return;

    try {
      const { error } = await supabase
        .from('profile_videos')
        .delete()
        .eq("id", video.id);

      if (error) throw error;

      toast({
        title: "Vídeo removido",
        description: "Vídeo removido com sucesso",
      });

      setVideo(null);
      setYoutubeUrl("");
      setTitle("");
    } catch (error: any) {
      toast({
        title: "Erro ao remover vídeo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const videoId = youtubeUrl ? extractYoutubeId(youtubeUrl) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Vídeo de Apresentação
        </CardTitle>
        <CardDescription>
          Adicione um vídeo do YouTube para apresentar seu trabalho
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="youtube-url">URL do YouTube</Label>
          <Input
            id="youtube-url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        <div>
          <Label htmlFor="video-title">Título (opcional)</Label>
          <Input
            id="video-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do vídeo"
          />
        </div>

        {videoId && (
          <div className="aspect-video">
            <iframe
              className="w-full h-full rounded"
              src={`https://www.youtube.com/embed/${videoId}`}
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
            <Button
              variant="destructive"
              onClick={handleDeleteVideo}
              disabled={loading}
            >
              Remover Vídeo
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
