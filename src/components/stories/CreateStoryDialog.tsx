import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [step, setStep] = useState<'select' | 'create'>('select');
  const [type, setType] = useState<'image' | 'video' | 'text'>('image');
  const [selectedProfile, setSelectedProfile] = useState<string>(profiles[0]?.id || '');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [textContent, setTextContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(backgroundColors[0].value);
  const [linkUrl, setLinkUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleTypeSelect = (selectedType: 'image' | 'video' | 'text') => {
    setType(selectedType);
    setStep('create');
    
    // Se for imagem ou vídeo, abrir o seletor de arquivo automaticamente
    if (selectedType === 'image' || selectedType === 'video') {
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    }
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
          type: type,
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
    setStep('select');
    setMediaFile(null);
    setMediaPreview('');
    setTextContent('');
    setLinkUrl('');
    setType('image');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[90vh] p-0 gap-0 overflow-hidden border-l-8 border-l-gradient-to-b from-purple-500 via-pink-500 to-orange-500">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-background via-background to-muted/20">
            <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent">
              Criar Story
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Compartilhe um momento especial</p>
          </DialogHeader>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {step === 'select' ? (
              <div className="space-y-6">
                {/* Seleção de perfil (se tiver múltiplos) */}
                {profiles.length > 1 && (
                  <div className="space-y-3 bg-muted/30 p-4 rounded-xl">
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

                {/* Pergunta inicial */}
                <div className="text-center py-8">
                  <h3 className="text-2xl font-bold mb-2">O que gostaria de publicar no seu story?</h3>
                  <p className="text-muted-foreground mb-8">Escolha o tipo de conteúdo</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Opção Imagem */}
                    <button
                      onClick={() => handleTypeSelect('image')}
                      className="group relative p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 hover:from-purple-500/20 hover:to-purple-500/10 border-2 border-purple-500/30 hover:border-purple-500 transition-all hover:scale-105"
                    >
                      <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-8 h-8 text-purple-500" />
                      </div>
                      <h4 className="font-bold text-lg mb-1">Imagem</h4>
                      <p className="text-sm text-muted-foreground">Compartilhe uma foto</p>
                    </button>

                    {/* Opção Vídeo */}
                    <button
                      onClick={() => handleTypeSelect('video')}
                      className="group relative p-8 rounded-2xl bg-gradient-to-br from-pink-500/10 to-pink-500/5 hover:from-pink-500/20 hover:to-pink-500/10 border-2 border-pink-500/30 hover:border-pink-500 transition-all hover:scale-105"
                    >
                      <div className="w-16 h-16 mx-auto mb-4 bg-pink-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Video className="w-8 h-8 text-pink-500" />
                      </div>
                      <h4 className="font-bold text-lg mb-1">Vídeo</h4>
                      <p className="text-sm text-muted-foreground">Grave um momento</p>
                    </button>

                    {/* Opção Texto */}
                    <button
                      onClick={() => handleTypeSelect('text')}
                      className="group relative p-8 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 hover:from-orange-500/20 hover:to-orange-500/10 border-2 border-orange-500/30 hover:border-orange-500 transition-all hover:scale-105"
                    >
                      <div className="w-16 h-16 mx-auto mb-4 bg-orange-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Type className="w-8 h-8 text-orange-500" />
                      </div>
                      <h4 className="font-bold text-lg mb-1">Texto</h4>
                      <p className="text-sm text-muted-foreground">Escreva uma mensagem</p>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Conteúdo baseado no tipo selecionado */}
                {type === 'text' ? (
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
                ) : (
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
                        <h3 className="text-lg font-semibold mb-2">Selecione uma {type === 'image' ? 'foto' : 'vídeo'}</h3>
                        <p className="text-sm text-muted-foreground mb-1">
                          {type === 'image' 
                            ? 'Imagens: JPG, PNG, WEBP ou GIF (máx. 10MB)'
                            : 'Vídeos: MP4, WEBM ou MOV (máx. 50MB)'}
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={type === 'image' 
                            ? 'image/jpeg,image/png,image/webp,image/gif'
                            : 'video/mp4,video/webm,video/quicktime'}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            handleMediaChange(e);
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}

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
            )}
          </div>

          {/* Footer - Botões fixos */}
          <div className="sticky bottom-0 px-6 py-4 border-t bg-background/95 backdrop-blur-sm">
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleClose} 
                className="flex-1" 
                disabled={isUploading}
                size="lg"
              >
                Cancelar
              </Button>
              {step === 'create' && (
                <Button 
                  onClick={handlePublish} 
                  className="flex-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white" 
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
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
