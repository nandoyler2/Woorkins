import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
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
  const [pollResults, setPollResults] = useState<{ [key: string]: number }>({});
  const [totalVotes, setTotalVotes] = useState(0);

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

  // Buscar se o usuário já respondeu e resultados da enquete
  useEffect(() => {
    if (!profileId || isPreview || sticker.type !== 'poll') return;

    const checkResponse = async () => {
      // Verificar se já respondeu
      const { data: response } = await supabase
        .from('story_sticker_responses')
        .select('*')
        .eq('sticker_id', sticker.id)
        .eq('profile_id', profileId)
        .single();

      if (response) {
        setHasResponded(true);
        // Buscar resultados
        await fetchPollResults();
      }
    };

    checkResponse();
  }, [profileId, sticker.id, sticker.type, isPreview]);

  const fetchPollResults = async () => {
    const { data: responses } = await supabase
      .from('story_sticker_responses')
      .select('response_data')
      .eq('sticker_id', sticker.id);

    if (responses) {
      const results: { [key: string]: number } = {};
      responses.forEach((r) => {
        if (r.response_data && typeof r.response_data === 'object' && 'option_id' in r.response_data) {
          const optionId = (r.response_data as any).option_id;
          results[optionId] = (results[optionId] || 0) + 1;
        }
      });
      setPollResults(results);
      setTotalVotes(responses.length);
    }
  };

  const handleResponse = async (responseData: any) => {
    if (!profileId || hasResponded) return;

    const success = await respondToSticker(sticker.id, profileId, responseData);
    if (success) {
      setHasResponded(true);
      toast.success('Voto registrado!');
      // Buscar resultados após votar
      await fetchPollResults();
    }
  };

  const style: CSSProperties = {
    position: 'absolute',
    left: `${sticker.position_x}%`,
    top: `${sticker.position_y}%`,
    transform: `translate(-50%, -50%) scale(${sticker.scale || 1})`,
    zIndex: 40,
    pointerEvents: (isPreview ? 'none' : 'auto'),
  };

  const renderSticker = () => {
    const containerClass = isPreview ? "cursor-move select-none" : "";
    
    switch (sticker.type) {
      case 'poll':
        return (
          <div style={style} className={containerClass}>
            <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[200px]">
              <p className="text-white font-bold text-sm mb-3">{sticker.content.question}</p>
              <div className="space-y-2">
                {sticker.content.options?.map((option: any) => {
                  const votes = pollResults[option.id] || 0;
                  const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                  
                  return (
                    <div
                      key={option.id}
                      className={`relative overflow-hidden transition rounded-full ${!isPreview && !hasResponded ? 'hover:bg-white/30 cursor-pointer' : ''}`}
                      onClick={() => !isPreview && !hasResponded && handleResponse({ option_id: option.id })}
                    >
                      {/* Barra de progresso (só mostra se já votou) */}
                      {hasResponded && (
                        <div
                          className="absolute inset-0 bg-white/30 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      )}
                      <div className={`relative px-4 py-2 ${!hasResponded ? 'bg-white/20' : ''}`}>
                        <div className="flex items-center justify-between">
                          <p className="text-white text-xs font-medium">{option.text}</p>
                          {hasResponded && (
                            <p className="text-white text-xs font-bold ml-2">{percentage}%</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasResponded && totalVotes > 0 && (
                <p className="text-white/60 text-[10px] mt-2 text-center">
                  {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
                </p>
              )}
            </div>
          </div>
        );

      case 'emoji':
        return (
          <div 
            style={style} 
            className={containerClass}
            onClick={() => !isPreview && !hasResponded && handleResponse({ emoji_tap: true })}
          >
            <span className={`text-4xl transition ${!isPreview ? 'hover:scale-110' : ''}`}>{sticker.content.emoji}</span>
          </div>
        );

      case 'link':
        return (
          <a
            href={sticker.content.url}
            target="_blank"
            rel="noopener noreferrer"
            style={style}
            className={`${containerClass} block`}
          >
            <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-2 hover:bg-black/70 transition">
              <ExternalLink className="w-4 h-4 text-white flex-shrink-0" />
              <span className="text-white text-sm font-medium">{sticker.content.title}</span>
            </div>
          </a>
        );

      default:
        return null;
    }
  };

  return <>{renderSticker()}</>;
};