import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedAreaPixels: any) => void;
  aspect: number;
}

export function ImageCropDialog({ open, imageSrc, onClose, onCropComplete, aspect }: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [minZoom, setMinZoom] = useState(1);

  const onMediaLoaded = useCallback((mediaSize: { naturalWidth: number; naturalHeight: number }) => {
    const cropWidth = 400;
    const cropHeight = 400 / aspect;
    const requiredZoom = Math.max(cropWidth / mediaSize.naturalWidth, cropHeight / mediaSize.naturalHeight);
    const initialZoom = Math.max(1, requiredZoom * 1.6);
    setMinZoom(requiredZoom);
    setZoom(initialZoom);
  }, [aspect]);

  const onCropChange = (location: any) => {
    setCrop(location);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = () => {
    if (croppedAreaPixels) {
      onCropComplete(croppedAreaPixels);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ajustar Imagem</DialogTitle>
          <DialogDescription>Use o mouse para arrastar e o controle para ajustar o zoom.</DialogDescription>
        </DialogHeader>
        
        <div className="relative h-96 bg-muted">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
            onMediaLoaded={onMediaLoaded}
            minZoom={minZoom}
            maxZoom={Math.max(2, minZoom * 2)}
            zoomSpeed={0.01}
            zoomWithScroll={true}
            cropSize={{ width: 400, height: 400 / aspect }}
            restrictPosition={false}
          />
        </div>

        <div className="space-y-2 px-4">
          <label className="text-sm font-medium">Zoom</label>
          <Slider
            value={[zoom]}
            onValueChange={(value) => setZoom(value[0])}
            min={minZoom}
            max={Math.max(2, minZoom * 2)}
            step={0.001}
            className="w-full"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-gradient-primary">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
