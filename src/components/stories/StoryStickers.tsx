import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, MessageCircleQuestion, Smile, MapPin, Link as LinkIcon, ImageIcon } from 'lucide-react';
import { PollStickerDialog } from './stickers/PollStickerDialog';
import { QuestionStickerDialog } from './stickers/QuestionStickerDialog';
import { EmojiStickerDialog } from './stickers/EmojiStickerDialog';
import { LocationStickerDialog } from './stickers/LocationStickerDialog';
import { LinkStickerDialog } from './stickers/LinkStickerDialog';
import { ImageStickerDialog } from './stickers/ImageStickerDialog';

export interface Sticker {
  id: string;
  type: 'poll' | 'question' | 'emoji' | 'location' | 'link' | 'image';
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  scale?: number;
  content: any;
}

interface StoryStickersProps {
  stickers: Sticker[];
  onAddSticker: (sticker: Omit<Sticker, 'id'>) => void;
  onRemoveSticker: (id: string) => void;
}

export const StoryStickers = ({ stickers, onAddSticker, onRemoveSticker }: StoryStickersProps) => {
  const [activeStickerDialog, setActiveStickerDialog] = useState<string | null>(null);

  const handleAddSticker = (type: string, content: any) => {
    const newSticker: Omit<Sticker, 'id'> = {
      type: type as any,
      position_x: 50,
      position_y: 50,
      width: type === 'image' ? 30 : 40,
      height: type === 'image' ? 30 : 20,
      rotation: 0,
      scale: 1,
      content
    };
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
          onClick={() => setActiveStickerDialog('question')}
        >
          <MessageCircleQuestion className="w-4 h-4 mr-2" />
          Pergunta
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
          onClick={() => setActiveStickerDialog('location')}
        >
          <MapPin className="w-4 h-4 mr-2" />
          Local
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setActiveStickerDialog('link')}
        >
          <LinkIcon className="w-4 h-4 mr-2" />
          Link
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setActiveStickerDialog('image')}
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          Imagem
        </Button>
      </div>

      <PollStickerDialog
        open={activeStickerDialog === 'poll'}
        onClose={() => setActiveStickerDialog(null)}
        onSave={(content) => handleAddSticker('poll', content)}
      />
      <QuestionStickerDialog
        open={activeStickerDialog === 'question'}
        onClose={() => setActiveStickerDialog(null)}
        onSave={(content) => handleAddSticker('question', content)}
      />
      <EmojiStickerDialog
        open={activeStickerDialog === 'emoji'}
        onClose={() => setActiveStickerDialog(null)}
        onSave={(content) => handleAddSticker('emoji', content)}
      />
      <LocationStickerDialog
        open={activeStickerDialog === 'location'}
        onClose={() => setActiveStickerDialog(null)}
        onSave={(content) => handleAddSticker('location', content)}
      />
      <LinkStickerDialog
        open={activeStickerDialog === 'link'}
        onClose={() => setActiveStickerDialog(null)}
        onSave={(content) => handleAddSticker('link', content)}
      />
      <ImageStickerDialog
        open={activeStickerDialog === 'image'}
        onClose={() => setActiveStickerDialog(null)}
        onSave={(content) => handleAddSticker('image', content)}
      />
    </>
  );
};
