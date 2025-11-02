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
  containerWidth?: number;
  containerHeight?: number;
  isPreview?: boolean;
}

export const InteractiveStickerRenderer = ({ 
  sticker, 
  containerWidth, 
  containerHeight,
  isPreview = false
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
    transform: `translate(-50%, -50%) scale(${sticker.scale || 1})`,
    width: sticker.type === 'image' ? `${sticker.width}%` : 'auto',
  };

  const renderSticker = () => {
    switch (sticker.type) {
      case 'poll':
        return (
          <div style={style} className="cursor-move select-none">
            <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[200px]">
              <p className="text-white font-bold text-sm mb-3">{sticker.content.question}</p>
              <div className="space-y-2">
                {sticker.content.options?.map((option: any) => (
                  <div
                    key={option.id}
                    className="bg-white/20 hover:bg-white/30 transition rounded-full px-4 py-2 cursor-pointer"
                    onClick={() => !hasResponded && handleResponse({ option_id: option.id })}
                  >
                    <p className="text-white text-xs font-medium text-center">{option.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'question':
        return (
          <div style={style} className="cursor-move select-none">
            <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[200px]">
              <p className="text-white font-bold text-sm mb-2">{sticker.content.text}</p>
              <input
                type="text"
                placeholder={sticker.content.placeholder}
                className="w-full px-3 py-2 rounded-full bg-white/20 text-white placeholder:text-white/60 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value && !hasResponded) {
                    handleResponse({ answer: e.currentTarget.value });
                  }
                }}
                disabled={hasResponded}
              />
            </div>
          </div>
        );

      case 'emoji':
        return (
          <div 
            style={style} 
            className="cursor-move select-none"
            onClick={() => !hasResponded && handleResponse({ emoji_tap: true })}
          >
            <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-full p-4 hover:scale-110 transition">
              <span className="text-4xl">{sticker.content.emoji}</span>
            </div>
          </div>
        );

      case 'location':
        return (
          <div style={style} className="cursor-move select-none">
            <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-white flex-shrink-0" />
              <span className="text-white text-sm font-medium">{sticker.content.name}</span>
            </div>
          </div>
        );

      case 'link':
        return (
          <a
            href={sticker.content.url}
            target="_blank"
            rel="noopener noreferrer"
            style={style}
            className="cursor-move select-none block"
          >
            <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-2 hover:bg-black/70 transition">
              <ExternalLink className="w-4 h-4 text-white flex-shrink-0" />
              <span className="text-white text-sm font-medium">{sticker.content.title}</span>
            </div>
          </a>
        );

      case 'image':
        return (
          <div style={style} className="cursor-move select-none">
            <img
              src={sticker.content.imageUrl}
              alt="Sticker"
              className="w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return <>{renderSticker()}</>;
};