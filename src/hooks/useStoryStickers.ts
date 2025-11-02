import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StorySticker {
  id: string;
  story_id: string;
  type: 'poll' | 'question' | 'emoji' | 'location' | 'link' | 'countdown' | 'quiz' | 'image';
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  content: any;
}

export const useStoryStickers = (storyId: string | null) => {
  const [stickers, setStickers] = useState<StorySticker[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storyId) return;

    const fetchStickers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('story_stickers')
          .select('*')
          .eq('story_id', storyId);

        if (error) throw error;
        
        // Garantir tipagem correta
        const typedStickers = (data || []).map(s => ({
          ...s,
          position_x: Number(s.position_x),
          position_y: Number(s.position_y),
          width: Number(s.width),
          height: Number(s.height),
          rotation: Number(s.rotation),
        })) as StorySticker[];
        
        setStickers(typedStickers);
      } catch (error) {
        console.error('Erro ao buscar stickers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStickers();
  }, [storyId]);

  const saveStickers = async (storyId: string, newStickers: Omit<StorySticker, 'id' | 'story_id'>[]) => {
    try {
      const stickersToInsert = newStickers.map(s => ({
        story_id: storyId,
        type: s.type,
        position_x: s.position_x,
        position_y: s.position_y,
        width: s.width,
        height: s.height,
        rotation: s.rotation,
        content: s.content
      }));

      const { error } = await supabase
        .from('story_stickers')
        .insert(stickersToInsert);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao salvar stickers:', error);
      return false;
    }
  };

  const respondToSticker = async (stickerId: string, profileId: string, responseData: any) => {
    try {
      const { error } = await supabase
        .from('story_sticker_responses')
        .insert({
          sticker_id: stickerId,
          profile_id: profileId,
          response_data: responseData
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao responder sticker:', error);
      return false;
    }
  };

  return { stickers, loading, saveStickers, respondToSticker };
};
