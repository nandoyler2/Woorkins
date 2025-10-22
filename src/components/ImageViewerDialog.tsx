import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageViewerDialogProps {
  imageUrl: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}

export function ImageViewerDialog({ imageUrl, alt, open, onClose }: ImageViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 bg-black/95 border-0">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </Button>
        <div className="flex items-center justify-center p-4">
          <img
            src={imageUrl}
            alt={alt}
            className="max-w-full max-h-[85vh] object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
