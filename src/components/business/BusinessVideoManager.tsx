import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Play, Trash2 } from "lucide-react";

interface Video {
  id: string;
  youtube_url: string;
  title?: string;
  active: boolean;
}

interface BusinessVideoManagerProps {
  businessId: string;
}

export function BusinessVideoManager({ businessId }: BusinessVideoManagerProps) {
  const [video, setVideo] = useState<Video | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadVideo();
  }, [businessId]);

  const loadVideo = async () => {
    try {
      const { data, error } = await supabase
        .from("business_videos")
        .select("*")
        .eq("business_id", businessId)
        .eq("active", true)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setVideo(data);
        setYoutubeUrl(data.youtube_url);
        setTitle(data.title || "");
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
        title: "URL obrigatória",
        description: "Cole o link do vídeo do YouTube",
        variant: "destructive",
      });
      return;
    }

    const videoId = extractYoutubeId(youtubeUrl);
    if (!videoId) {
      toast({
        title: "URL inválida",
        description: "Cole um link válido do YouTube",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (video) {
        const { error } = await supabase
          .from("business_videos")
          .update({
            youtube_url: youtubeUrl,
            title: title || null,
          })
          .eq("id", video.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_videos")
          .insert({
            business_id: businessId,
            youtube_url: youtubeUrl,
            title: title || null,
            active: true,
          });

        if (error) throw error;
      }

      toast({
        title: "Vídeo salvo com sucesso!",
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
    if (!video) return;

    try {
      const { error } = await supabase
        .from("business_videos")
        .delete()
        .eq("id", video.id);

      if (error) throw error;

      toast({
        title: "Vídeo removido com sucesso!",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Vídeo de Apresentação
        </CardTitle>
        <CardDescription>
          Adicione um vídeo do YouTube para apresentar seu negócio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="youtube">Link do YouTube *</Label>
          <Input
            id="youtube"
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

        {youtubeUrl && extractYoutubeId(youtubeUrl) && (
          <div className="aspect-video">
            <iframe
              className="w-full h-full rounded"
              src={`https://www.youtube.com/embed/${extractYoutubeId(youtubeUrl)}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSaveVideo} disabled={loading}>
            Salvar
          </Button>
          {video && (
            <Button variant="outline" onClick={handleDeleteVideo}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
