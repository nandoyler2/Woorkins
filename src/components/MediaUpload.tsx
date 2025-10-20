import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/lib/imageCompression';

interface MediaUploadProps {
  onUpload: (url: string, type: string) => void;
  accept?: string;
  maxSizeMB?: number;
}

export function MediaUpload({ onUpload, accept = "image/*,video/*", maxSizeMB = 50 }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: `O arquivo deve ter no máximo ${maxSizeMB}MB`,
        variant: 'destructive',
      });
      return;
    }

    const type = file.type.startsWith('image/') ? 'image' : 'video';
    setMediaType(type);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      let fileToUpload: File | Blob = file;

      // Compress images before upload
      if (type === 'image') {
        console.log('Compressing image...');
        fileToUpload = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
          maxSizeMB: 2
        });
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${Date.now()}-${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('business-media')
        .upload(filePath, fileToUpload, {
          contentType: type === 'image' ? 'image/jpeg' : file.type
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-media')
        .getPublicUrl(filePath);

      onUpload(publicUrl, type);
      
      toast({
        title: 'Upload concluído!',
        description: 'Mídia enviada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setMediaType(null);
  };

  return (
    <div className="space-y-4">
      {preview ? (
        <Card className="relative p-4">
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 z-10"
            onClick={clearPreview}
          >
            <X className="w-4 h-4" />
          </Button>
          {mediaType === 'image' ? (
            <img src={preview} alt="Preview" className="w-full h-64 object-cover rounded-lg" />
          ) : (
            <video src={preview} controls className="w-full h-64 rounded-lg" />
          )}
        </Card>
      ) : (
        <label className="block cursor-pointer">
          <Card className="p-8 border-2 border-dashed hover:border-primary transition-colors">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex gap-2">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                <Video className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Clique para fazer upload</p>
                <p className="text-sm text-muted-foreground">
                  Imagem ou vídeo (máx. {maxSizeMB}MB)
                </p>
              </div>
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
          </Card>
          <input
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}
      {uploading && (
        <div className="text-center text-sm text-muted-foreground">
          Fazendo upload...
        </div>
      )}
    </div>
  );
}
