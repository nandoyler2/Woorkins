import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageStickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (content: any) => void;
}

export function ImageStickerDialog({ open, onClose, onSave }: ImageStickerDialogProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Formato inválido',
        description: 'Selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 5MB',
        variant: 'destructive',
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!preview) {
      toast({
        title: 'Imagem necessária',
        description: 'Selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    onSave({ imageUrl: preview, file: imageFile });
    handleClose();
  };

  const handleClose = () => {
    setImageFile(null);
    setPreview('');
    onClose();
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreview('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Imagem</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          {!preview ? (
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-40 border-2 border-dashed"
              variant="outline"
            >
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="w-8 h-8" />
                <span>Selecionar Imagem</span>
              </div>
            </Button>
          ) : (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-40 object-contain rounded-lg bg-muted"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={handleRemoveImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Adicionar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}