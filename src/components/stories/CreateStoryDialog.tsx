import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageIcon, Video, Type, Link as LinkIcon, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/lib/imageCompression';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  profile_type: string;
  avatar_url?: string;
}

interface CreateStoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  onStoryCreated: () => void;
}

const backgroundColors = [
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Laranja', value: '#F97316' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Vermelho', value: '#EF4444' },
];

export function CreateStoryDialog({ isOpen, onClose, profiles, onStoryCreated }: CreateStoryDialogProps) {
  const [type, setType] = useState<'image' | 'video' | 'text'>('image');
  const [selectedProfile, setSelectedProfile] = useState<string>(profiles[0]?.id || '');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [textContent, setTextContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(backgroundColors[0].value);
  const [linkUrl, setLinkUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = type === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024; // 10MB para imagem, 50MB para vídeo
    if (file.size > maxSize) {
      toast({
        title: 'Arquivo muito grande',
        description: `O arquivo deve ter no máximo ${type === 'image' ? '10' : '50'}MB`,
        variant: 'destructive',
      });
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handlePublish = async () => {
    if (!selectedProfile) {
      toast({
        title: 'Erro',
        description: 'Selecione um perfil para postar',
        variant: 'destructive',
      });
      return;
    }

    if (type !== 'text' && !mediaFile) {
      toast({
        title: 'Erro',
        description: 'Selecione uma mídia para fazer upload',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'text' && !textContent.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite um texto para o story',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      let mediaUrl = null;

      // Upload de mídia se necessário
      if (type !== 'text' && mediaFile) {
        let fileToUpload = mediaFile;

        // Comprimir imagem se necessário
        if (type === 'image') {
          const compressedBlob = await compressImage(mediaFile, {
            maxSizeMB: 2,
          });
          // Converter Blob para File
          fileToUpload = new File([compressedBlob], mediaFile.name, {
            type: compressedBlob.type,
          });
        }

        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${selectedProfile}/${Date.now()}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from('stories')
          .upload(fileName, fileToUpload);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
      }

      // Criar story no banco
      const { error: insertError } = await supabase
        .from('profile_stories')
        .insert({
          profile_id: selectedProfile,
          type,
          media_url: mediaUrl,
          text_content: type === 'text' ? textContent : null,
          background_color: type === 'text' ? backgroundColor : null,
          link_url: linkUrl || null,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Story publicado! ✨',
        description: 'Seu story foi publicado com sucesso',
      });

      onStoryCreated();
      handleClose();
    } catch (error) {
      console.error('Error creating story:', error);
      toast({
        title: 'Erro ao publicar',
        description: 'Não foi possível publicar o story. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setMediaFile(null);
    setMediaPreview('');
    setTextContent('');
    setLinkUrl('');
    setType('image');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Criar Story</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção de perfil (se tiver múltiplos) */}
          {profiles.length > 1 && (
            <div className="space-y-2">
              <Label>Postar como:</Label>
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tabs de tipo */}
          <Tabs value={type} onValueChange={(v) => setType(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="image">
                <ImageIcon className="w-4 h-4 mr-2" />
                Imagem
              </TabsTrigger>
              <TabsTrigger value="video">
                <Video className="w-4 h-4 mr-2" />
                Vídeo
              </TabsTrigger>
              <TabsTrigger value="text">
                <Type className="w-4 h-4 mr-2" />
                Texto
              </TabsTrigger>
            </TabsList>

            {/* Conteúdo - Imagem */}
            <TabsContent value="image" className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                {mediaPreview ? (
                  <div className="relative">
                    <img
                      src={mediaPreview}
                      alt="Preview"
                      className="max-h-96 mx-auto rounded-lg"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setMediaFile(null);
                        setMediaPreview('');
                      }}
                    >
                      Alterar imagem
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Clique para selecionar uma imagem
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, WEBP ou GIF (máx. 10MB)
                    </p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleMediaChange}
                    />
                  </label>
                )}
              </div>
            </TabsContent>

            {/* Conteúdo - Vídeo */}
            <TabsContent value="video" className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                {mediaPreview ? (
                  <div className="relative">
                    <video
                      src={mediaPreview}
                      controls
                      className="max-h-96 mx-auto rounded-lg"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setMediaFile(null);
                        setMediaPreview('');
                      }}
                    >
                      Alterar vídeo
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Clique para selecionar um vídeo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      MP4 ou WEBM (máx. 50MB)
                    </p>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={handleMediaChange}
                    />
                  </label>
                )}
              </div>
            </TabsContent>

            {/* Conteúdo - Texto */}
            <TabsContent value="text" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Cor de fundo:</Label>
                  <div className="grid grid-cols-6 gap-2 mt-2">
                    {backgroundColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setBackgroundColor(color.value)}
                        className={`w-full h-12 rounded-lg transition-all ${
                          backgroundColor === color.value
                            ? 'ring-2 ring-primary ring-offset-2'
                            : ''
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Texto:</Label>
                  <Textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Escreva seu texto aqui..."
                    className="min-h-32 text-lg"
                    maxLength={300}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {textContent.length}/300 caracteres
                  </p>
                </div>

                {/* Preview */}
                <div
                  className="rounded-lg p-6 min-h-48 flex items-center justify-center text-center"
                  style={{ backgroundColor }}
                >
                  <p className="text-white text-xl font-bold break-words max-w-full">
                    {textContent || 'Seu texto aparecerá aqui'}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Link opcional */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Link (opcional)
            </Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1" disabled={isUploading}>
              Cancelar
            </Button>
            <Button onClick={handlePublish} className="flex-1" disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                'Publicar Story'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
