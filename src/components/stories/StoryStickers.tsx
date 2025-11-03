import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, Smile, Link as LinkIcon } from 'lucide-react';
import { PollStickerDialog } from './stickers/PollStickerDialog';
import { EmojiStickerDialog } from './stickers/EmojiStickerDialog';
import { LinkStickerDialog } from './stickers/LinkStickerDialog';

export interface Sticker {
  id: string;
  type: 'poll' | 'emoji' | 'link';
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  content: any;
  scale?: number;
}

interface StoryStickersProps {
  stickers: Sticker[];
  onAddSticker: (sticker: Omit<Sticker, 'id'>) => void;
  onRemoveSticker: (id: string) => void;
}

export const StoryStickers = ({ stickers, onAddSticker, onRemoveSticker }: StoryStickersProps) => {
  const [activeStickerDialog, setActiveStickerDialog] = useState<string | null>(null);

  const handleAddSticker = (type: string, content: any) => {
    console.log(`🎯 Adicionando sticker tipo: ${type}`, content);
    const newSticker: Omit<Sticker, 'id'> = {
      type: type as any,
      position_x: 50,
      position_y: 50,
      width: 40,
      height: 20,
      rotation: 0,
      content,
      scale: 1
    };
    console.log('🎯 Sticker criado:', newSticker);
    onAddSticker(newSticker);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setActiveStickerDialog('poll')}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Enquete
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setActiveStickerDialog('emoji')}
        >
          <Smile className="w-4 h-4 mr-2" />
          Emoji
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setActiveStickerDialog('link')}
        >
          <LinkIcon className="w-4 h-4 mr-2" />
          Link
        </Button>
      </div>

      <PollStickerDialog
        open={activeStickerDialog === 'poll'}
        onClose={() => setActiveStickerDialog(null)}
        onSave={(content) => handleAddSticker('poll', content)}
      />
      <EmojiStickerDialog
        open={activeStickerDialog === 'emoji'}
        onClose={() => setActiveStickerDialog(null)}
        onSave={(content) => handleAddSticker('emoji', content)}
      />
      <LinkStickerDialog
        open={activeStickerDialog === 'link'}
        onClose={() => setActiveStickerDialog(null)}
        onSave={(content) => handleAddSticker('link', content)}
      />
    </>
  );
};