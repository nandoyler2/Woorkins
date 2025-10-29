import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageIcon, Video, Type, Link as LinkIcon, Upload, Loader2, Camera } from 'lucide-react';
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
  const [mediaType, setMediaType] = useState<'media' | 'text'>('media');
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

    if (mediaType === 'media' && !mediaFile) {
      toast({
        title: 'Erro',
        description: 'Selecione uma mídia para fazer upload',
        variant: 'destructive',
      });
      return;
    }

    if (mediaType === 'text' && !textContent.trim()) {
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
      if (mediaType === 'media' && mediaFile) {
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
          type: mediaType === 'text' ? 'text' : type,
          media_url: mediaUrl,
          text_content: mediaType === 'text' ? textContent : null,
          background_color: mediaType === 'text' ? backgroundColor : null,
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
    setMediaType('media');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
        <DialogHeader className="space-y-1 pb-4 border-b">
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent">
            Criar Story
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Compartilhe um momento especial</p>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(95vh-180px)] pr-2">
          {/* Seleção de perfil (se tiver múltiplos) */}
          {profiles.length > 1 && (
            <div className="space-y-2 bg-muted/30 p-4 rounded-xl">
              <Label className="text-sm font-semibold">Postar como:</Label>
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger className="bg-background">
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
          <Tabs value={mediaType} onValueChange={(v) => setMediaType(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
              <TabsTrigger value="media" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
                <ImageIcon className="w-4 h-4 mr-2" />
                Foto/Vídeo
              </TabsTrigger>
              <TabsTrigger value="text" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
                <Type className="w-4 h-4 mr-2" />
                Texto
              </TabsTrigger>
            </TabsList>

            {/* Conteúdo - Mídia (Imagem/Vídeo unificados) */}
            <TabsContent value="media" className="mt-6 space-y-4">
              <div className="border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center bg-gradient-to-br from-muted/30 to-transparent hover:border-primary/50 transition-all">
                {mediaPreview ? (
                  <div className="relative space-y-4">
                    {type === 'image' ? (
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        className="max-h-[400px] mx-auto rounded-xl shadow-2xl"
                      />
                    ) : (
                      <video
                        src={mediaPreview}
                        controls
                        className="max-h-[400px] mx-auto rounded-xl shadow-2xl"
                      />
                    )}
                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-background/80 backdrop-blur-sm"
                      onClick={() => {
                        setMediaFile(null);
                        setMediaPreview('');
                        setType('image');
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Alterar arquivo
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block group">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-10 h-10 text-purple-500" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Selecione uma foto ou vídeo</h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      Imagens: JPG, PNG, WEBP ou GIF (máx. 10MB)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Vídeos: MP4, WEBM ou MOV (máx. 50MB)
                    </p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        // Detectar tipo automaticamente
                        const isVideo = file.type.startsWith('video/');
                        setType(isVideo ? 'video' : 'image');
                        handleMediaChange(e);
                      }}
                    />
                  </label>
                )}
              </div>
            </TabsContent>

            {/* Conteúdo - Texto */}
            <TabsContent value="text" className="mt-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Escolha uma cor de fundo:</Label>
                  <div className="grid grid-cols-6 gap-3">
                    {backgroundColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setBackgroundColor(color.value)}
                        className={`w-full h-16 rounded-xl transition-all hover:scale-105 ${
                          backgroundColor === color.value
                            ? 'ring-4 ring-primary ring-offset-2 scale-105'
                            : 'ring-2 ring-border'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2 block">Seu texto:</Label>
                  <Textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Escreva algo inspirador..."
                    className="min-h-32 text-lg resize-none bg-background/50"
                    maxLength={300}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-muted-foreground">
                      {textContent.length}/300 caracteres
                    </p>
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Preview:</Label>
                  <div
                    className="rounded-2xl p-8 min-h-[300px] flex items-center justify-center text-center shadow-xl"
                    style={{ backgroundColor }}
                  >
                    <p className="text-white text-2xl font-bold break-words max-w-full leading-relaxed drop-shadow-lg">
                      {textContent || 'Seu texto aparecerá aqui'}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Link opcional */}
          <div className="space-y-2 bg-muted/30 p-4 rounded-xl">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <LinkIcon className="w-4 h-4" />
              Link (opcional)
            </Label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://seusite.com"
              type="url"
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">Adicione um link para seus seguidores acessarem</p>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            className="flex-1" 
            disabled={isUploading}
            size="lg"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handlePublish} 
            className="flex-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600" 
            disabled={isUploading}
            size="lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5 mr-2" />
                Publicar Story
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
