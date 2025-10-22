import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';

interface InlineCropEditorProps {
  imageUrl: string;
  onSave: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio: number;
  className?: string;
}

export function InlineCropEditor({
  imageUrl,
  onSave,
  onCancel,
  aspectRatio,
  className = ''
}: InlineCropEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      if (containerRef.current && imageRef.current) {
        const container = containerRef.current.getBoundingClientRect();
        const imgAspect = img.width / img.height;
        const containerAspect = container.width / container.height;

        let width, height;
        if (imgAspect > containerAspect) {
          height = container.height;
          width = height * imgAspect;
        } else {
          width = container.width;
          height = width / imgAspect;
        }

        setImageSize({ width, height });
        // Centralizar inicialmente
        setPosition({
          x: (container.width - width) / 2,
          y: (container.height - height) / 2
        });
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const scaledWidth = imageSize.width * scale;
    const scaledHeight = imageSize.height * scale;

    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;

    // Limitar movimento para não sair muito do container
    const minX = container.width - scaledWidth;
    const maxX = 0;
    const minY = container.height - scaledHeight;
    const maxY = 0;

    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleSave = async () => {
    if (!containerRef.current || !imageRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = container.width;
    canvas.height = container.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(
        img,
        position.x,
        position.y,
        imageSize.width * scale,
        imageSize.height * scale
      );

      canvas.toBlob((blob) => {
        if (blob) {
          onSave(blob);
        }
      }, 'image/jpeg', 0.95);
    };
    img.src = imageUrl;
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="relative overflow-hidden cursor-move bg-muted w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ userSelect: 'none' }}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Crop"
          className="absolute"
          draggable={false}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${imageSize.width * scale}px`,
            height: `${imageSize.height * scale}px`,
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Controles */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-full px-4 py-2.5 shadow-xl border-2 border-border z-50">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleZoomOut}
          className="h-8 w-8 p-0 rounded-full hover:bg-primary/10"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        
        <span className="text-xs font-medium min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={handleZoomIn}
          className="h-8 w-8 p-0 rounded-full hover:bg-primary/10"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-8 px-3 rounded-full hover:bg-destructive/10 hover:text-destructive font-medium"
        >
          <X className="w-4 h-4 mr-1" />
          Cancelar
        </Button>

        <Button
          size="sm"
          onClick={handleSave}
          className="h-8 px-3 rounded-full bg-primary hover:bg-primary/90 font-medium"
        >
          <Check className="w-4 h-4 mr-1" />
          Salvar
        </Button>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium shadow-lg border-2 border-border z-50">
        Arraste para ajustar a posição
      </div>
    </div>
  );
}
