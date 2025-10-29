import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface QuestionStickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (content: any) => void;
}

export const QuestionStickerDialog = ({ open, onClose, onSave }: QuestionStickerDialogProps) => {
  const [text, setText] = useState('');
  const [placeholder, setPlaceholder] = useState('Digite sua resposta...');

  const handleSave = () => {
    if (!text.trim()) return;

    onSave({
      text,
      placeholder
    });
    setText('');
    setPlaceholder('Digite sua resposta...');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Pergunta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Pergunta</Label>
            <Input
              placeholder="Faça uma pergunta..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Input
              placeholder="Texto de exemplo..."
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              maxLength={50}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
