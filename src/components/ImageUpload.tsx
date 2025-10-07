import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SafeImage } from '@/components/ui/safe-image';
import { ImageCropDialog } from './ImageCropDialog';

interface ImageUploadProps {
  currentImageUrl: string | null;
  onUpload: (url: string) => void;
  bucket: string;
  folder: string;
  type?: 'logo' | 'cover';
}

export function ImageUpload({ currentImageUrl, onUpload, bucket, folder, type = 'logo' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tempPreview, setTempPreview] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const config = type === 'logo' 
    ? { 
        aspect: 1, 
        width: 'w-32', 
        height: 'h-32', 
        text: '200x200px (quadrado)',
        outputSize: 200
      }
    : { 
        aspect: 3,
        width: 'w-full max-w-2xl', 
        height: 'h-48', 
        text: '1200x400px (horizontal)',
        outputSize: 1200
      };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Target output dimensions based on config
    const targetWidth = config.outputSize; // width
    const targetHeight = Math.round(config.outputSize / config.aspect); // height derived from aspect

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Draw the cropped area from the source image scaled to target size
    ctx.drawImage(
      image,
      Math.max(0, Math.floor(pixelCrop.x)),
      Math.max(0, Math.floor(pixelCrop.y)),
      Math.floor(pixelCrop.width),
      Math.floor(pixelCrop.height),
      0,
      0,
      targetWidth,
      targetHeight
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 10MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempPreview(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedAreaPixels: any) => {
    if (!tempPreview || !selectedFile) return;

    setUploading(true);
    setShowCropDialog(false);

    try {
      const croppedBlob = await getCroppedImg(tempPreview, croppedAreaPixels);
      
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, croppedBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setPreview(publicUrl);
      onUpload(publicUrl);

      toast({
        title: 'Sucesso!',
        description: 'Imagem enviada com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setSelectedFile(null);
      setTempPreview(null);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Tamanho recomendado: {config.text}</span>
        </div>

        {preview ? (
          <div className="relative">
            <div className="border rounded-lg overflow-hidden bg-muted">
              <SafeImage
                src={preview}
                alt="Preview"
                className={`${config.width} ${config.height} object-cover`}
              />
            </div>
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Trocar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Preview: Como ficará no perfil
            </p>
          </div>
        ) : (
          <div className={`border-2 border-dashed rounded-lg ${config.height} flex items-center justify-center`}>
            <div className="text-center p-8">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                {type === 'logo' ? 'Logo quadrado (1:1)' : 'Capa horizontal (3:1)'}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Enviando...' : 'Selecionar Imagem'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {tempPreview && (
        <ImageCropDialog
          open={showCropDialog}
          imageSrc={tempPreview}
          onClose={() => {
            setShowCropDialog(false);
            setTempPreview(null);
            setSelectedFile(null);
          }}
          onCropComplete={handleCropComplete}
          aspect={config.aspect}
        />
      )}
    </>
  );
}
