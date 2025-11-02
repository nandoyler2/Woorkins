import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink } from 'lucide-react';
import { StorySticker } from '@/hooks/useStoryStickers';
import { useAuth } from '@/contexts/AuthContext';
import { useStoryStickers } from '@/hooks/useStoryStickers';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface InteractiveStickerRendererProps {
  sticker: StorySticker;
  containerWidth: number;
  containerHeight: number;
}

export const InteractiveStickerRenderer = ({ 
  sticker, 
  containerWidth, 
  containerHeight 
}: InteractiveStickerRendererProps) => {
  const { user } = useAuth();
  const { respondToSticker } = useStoryStickers(null);
  const [hasResponded, setHasResponded] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Buscar profile_id do usuário
  useEffect(() => {
    if (!user?.id) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (data) setProfileId(data.id);
    };

    fetchProfile();
  }, [user?.id]);

  const handleResponse = async (responseData: any) => {
    if (!profileId || hasResponded) return;

    const success = await respondToSticker(sticker.id, profileId, responseData);
    if (success) {
      setHasResponded(true);
      toast.success('Resposta enviada!');
    }
  };

  const style = {
    position: 'absolute' as const,
    left: `${sticker.position_x}%`,
    top: `${sticker.position_y}%`,
    width: `${sticker.width}%`,
    height: `${sticker.height}%`,
    transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale || 1})`,
  };

  const renderSticker = () => {
    switch (sticker.type) {
      case 'poll':
        return (
          <div style={style} className="bg-black/50 backdrop-blur-sm rounded-2xl p-4">
            <p className="text-white font-bold text-sm mb-2">{sticker.content.question}</p>
            <div className="space-y-2">
              {sticker.content.options?.map((option: any) => (
                <Button
                  key={option.id}
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleResponse({ option_id: option.id })}
                  disabled={hasResponded}
                >
                  {option.text}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'question':
        return (
          <div style={style} className="bg-black/50 backdrop-blur-sm rounded-2xl p-4">
            <p className="text-white font-bold text-sm mb-2">{sticker.content.text}</p>
            <input
              type="text"
              placeholder={sticker.content.placeholder}
              className="w-full px-3 py-2 rounded-lg bg-white/20 text-white placeholder:text-white/60 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  handleResponse({ answer: e.currentTarget.value });
                }
              }}
              disabled={hasResponded}
            />
          </div>
        );

      case 'emoji':
        return (
          <button
            style={style}
            className="bg-black/50 backdrop-blur-sm rounded-full p-4 hover:scale-110 transition"
            onClick={() => handleResponse({ emoji_tap: true })}
            disabled={hasResponded}
          >
            <span className="text-4xl">{sticker.content.emoji}</span>
          </button>
        );

      case 'location':
        return (
          <div style={style} className="bg-black/50 backdrop-blur-sm rounded-2xl px-4 py-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">{sticker.content.name}</span>
          </div>
        );

      case 'link':
        return (
          <a
            href={sticker.content.url}
            target="_blank"
            rel="noopener noreferrer"
            style={style}
            className="bg-black/50 backdrop-blur-sm rounded-2xl px-4 py-2 flex items-center gap-2 hover:bg-black/70 transition"
          >
            <ExternalLink className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">{sticker.content.title}</span>
          </a>
        );

      case 'image':
        return (
          <img
            src={sticker.content.imageUrl}
            alt="Sticker"
            style={style}
            className="rounded-lg shadow-lg object-contain"
          />
        );

      default:
        return null;
    }
  };

  return <>{renderSticker()}</>;
};