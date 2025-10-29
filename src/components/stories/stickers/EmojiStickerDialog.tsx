import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface EmojiStickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (content: any) => void;
}

const EMOJI_OPTIONS = ['❤️', '😍', '🔥', '👏', '😂', '🎉', '💯', '⭐', '👍', '🤩', '😎', '💪'];

export const EmojiStickerDialog = ({ open, onClose, onSave }: EmojiStickerDialogProps) => {
  const [selectedEmoji, setSelectedEmoji] = useState('❤️');

  const handleSave = () => {
    onSave({
      emoji: selectedEmoji,
      count: 0
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escolher Emoji</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-6 gap-2 py-4">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setSelectedEmoji(emoji)}
              className={`text-4xl p-3 rounded-lg hover:bg-accent transition ${
                selectedEmoji === emoji ? 'bg-accent ring-2 ring-primary' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
