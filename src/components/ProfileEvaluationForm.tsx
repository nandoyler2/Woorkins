import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Upload, X, Image as ImageIcon, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/lib/imageCompression';

interface ProfileEvaluationFormProps {
  profileId: string;
  onSuccess: () => void;
}

export function ProfileEvaluationForm({ profileId, onSuccess }: ProfileEvaluationFormProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validar tipo e tamanho
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB vídeo, 10MB imagem
      
      if (!isImage && !isVideo) {
        toast({
          title: 'Erro',
          description: 'Apenas imagens e vídeos são permitidos',
          variant: 'destructive',
        });
        return false;
      }
      
      if (file.size > maxSize) {
        toast({
          title: 'Erro',
          description: `Arquivo muito grande. Máximo ${isVideo ? '50MB' : '10MB'}`,
          variant: 'destructive',
        });
        return false;
      }
      
      return true;
    });
    
    setMediaFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 arquivos
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma nota',
        variant: 'destructive',
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, escreva uma mensagem sobre sua avaliação',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar logado para avaliar',
          variant: 'destructive',
        });
        return;
      }

      // Buscar o profile_id do usuário logado
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar perfil do usuário',
          variant: 'destructive',
        });
        return;
      }

      // Upload de mídia
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];

      for (const file of mediaFiles) {
        const isImage = file.type.startsWith('image/');
        let fileToUpload = file;

        // Comprimir imagens
        if (isImage) {
          const compressed = await compressImage(file, { maxWidth: 1024, quality: 0.8 });
          fileToUpload = new File([compressed], file.name, { type: file.type });
        }

        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const bucket = 'avatars'; // Reutilizar bucket público existente

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, fileToUpload);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(uploadData.path);

        mediaUrls.push(publicUrl);
        mediaTypes.push(isImage ? 'image' : 'video');
      }

      // Determinar categoria automaticamente
      const evaluationCategory = rating <= 3 ? 'complaint' : 'positive';

      // Criar avaliação - usar profile_id do usuário logado
      const { error: insertError } = await supabase
        .from('evaluations' as any)
        .insert({
          user_id: userProfile.id,
          business_id: profileId,
          rating,
          title: evaluationCategory === 'complaint' ? 'Reclamação' : 'Avaliação Positiva',
          content: content.trim(),
          evaluation_type: 'client',
          media_urls: mediaUrls.length > 0 ? mediaUrls : null,
          media_types: mediaTypes.length > 0 ? mediaTypes : null,
          evaluation_category: evaluationCategory,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Sucesso',
        description: 'Avaliação enviada com sucesso!',
      });

      // Resetar form
      setRating(0);
      setContent('');
      setMediaFiles([]);
      onSuccess();
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar avaliação',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <Label className="mb-2 block">Sua Avaliação *</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {rating <= 3 ? 'Sua avaliação será classificada como Reclamação' : 'Sua avaliação será classificada como Positiva'}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="content" className="mb-2 block">Mensagem * (obrigatório)</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Compartilhe sua experiência..."
            className="min-h-[120px]"
            required
          />
        </div>

        <div>
          <Label className="mb-2 block">Adicionar Fotos/Vídeos (opcional)</Label>
          <div className="space-y-3">
            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {mediaFiles.map((file, idx) => (
                  <div key={idx} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Video className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {mediaFiles.length < 5 && (
              <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Adicionar imagens/vídeos ({mediaFiles.length}/5)
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Máximo 5 arquivos. Imagens até 10MB, vídeos até 50MB.
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={uploading || rating === 0 || !content.trim()}
          className="w-full"
        >
          {uploading ? 'Enviando...' : 'Enviar Avaliação'}
        </Button>
      </CardContent>
    </Card>
  );
}