import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageIcon, Video, Type, Link as LinkIcon, Upload, Loader2, Camera, Bold, Italic, Link2, Crop } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { useUpload } from '@/contexts/UploadContext';

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

const backgroundStyles = [
  { name: 'Gradiente Roxo', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Gradiente Rosa', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Gradiente Laranja', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { name: 'Gradiente Azul', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { name: 'Gradiente Verde', value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { name: 'Gradiente Vermelho', value: 'linear-gradient(135deg, #fa709a 0%, #d4145a 100%)' },
  { name: 'Pôr do Sol', value: 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 50%, #ff99ac 100%)' },
  { name: 'Oceano', value: 'linear-gradient(135deg, #2af598 0%, #009efd 100%)' },
  { name: 'Noite', value: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e22ce 100%)' },
  { name: 'Aurora', value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
];

export function CreateStoryDialog({ isOpen, onClose, profiles, onStoryCreated }: CreateStoryDialogProps) {
  const [step, setStep] = useState<'select' | 'create'>('select');
  const [type, setType] = useState<'image' | 'video' | 'text'>('image');
  const [selectedProfile, setSelectedProfile] = useState<string>(profiles[0]?.id || '');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [originalImage, setOriginalImage] = useState<string>(''); // Imagem original para crop
  const [textContent, setTextContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(backgroundStyles[0].value);
  const [customColor, setCustomColor] = useState('#8B5CF6');
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textLink, setTextLink] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [cropData, setCropData] = useState<any>(null); // Dados do último crop
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { uploadStory, currentUpload } = useUpload();

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = type === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Arquivo muito grande',
        description: `O arquivo deve ter no máximo ${type === 'image' ? '10' : '50'}MB`,
        variant: 'destructive',
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    
    // Se for imagem, guardar original e abrir crop
    if (type === 'image') {
      setOriginalImage(previewUrl);
      setMediaFile(file);
      setShowCropDialog(true);
    } else {
      // Para vídeo, usar direto
      setMediaFile(file);
      setMediaPreview(previewUrl);
    }
  };

  const handleCroppedImage = async (croppedAreaPixels: any) => {
    try {
      // Guardar dados do crop
      setCropData(croppedAreaPixels);
      
      // Criar preview cropado
      const croppedBlob = await getCroppedImg(originalImage, croppedAreaPixels);
      setMediaPreview(URL.createObjectURL(croppedBlob));
      setShowCropDialog(false);
    } catch (error) {
      console.error('Error cropping image:', error);
      toast({
        title: 'Erro ao cortar imagem',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    }
  };

  // Função auxiliar para criar a imagem cortada
  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const createImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });
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

    // Se for imagem e tiver crop, aplicar o crop final
    let finalMediaFile = mediaFile;
    if (type === 'image' && cropData && originalImage) {
      try {
        const croppedBlob = await getCroppedImg(originalImage, cropData);
        finalMediaFile = new File([croppedBlob], `story-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
      } catch (error) {
        console.error('Error applying final crop:', error);
        toast({
          title: 'Erro ao processar imagem',
          description: 'Tente novamente',
          variant: 'destructive',
        });
        return;
      }
    }

    // Preparar metadados de formatação se for texto
    const metadata = type === 'text' && (textBold || textItalic) ? {
      text_bold: textBold,
      text_italic: textItalic,
    } : undefined;

    // Iniciar upload em background
    await uploadStory({
      profileId: selectedProfile,
      type: type,
      mediaFile: finalMediaFile || undefined,
      textContent: type === 'text' ? textContent : undefined,
      backgroundColor: type === 'text' ? backgroundColor : undefined,
      linkUrl: type === 'text' && textLink ? textLink : (linkUrl || undefined),
      metadata,
    });

    // Fechar dialog e limpar
    handleClose();
    onStoryCreated();
  };

  const handleClose = () => {
    setStep('select');
    setMediaFile(null);
    setMediaPreview('');
    setOriginalImage('');
    setCropData(null);
    setTextContent('');
    setTextLink('');
    setLinkUrl('');
    setType('image');
    setTextBold(false);
    setTextItalic(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 overflow-hidden border-l-8 border-l-gradient-to-b from-purple-500 via-pink-500 to-orange-500">
          <div className="flex h-full">
            {/* Coluna esquerda - Header, Formulário e Botões */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header */}
              <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-background via-background to-muted/20 flex-shrink-0">
                <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                  Criar Story
                </DialogTitle>
                <p className="text-sm text-muted-foreground">Compartilhe um momento especial</p>
              </DialogHeader>

              {/* Formulário - Scrollable */}
              <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
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
                  <div className="space-y-4">
                    {/* Conteúdo baseado no tipo selecionado */}
                    {type === 'text' ? (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-semibold mb-2 block">Escolha um fundo:</Label>
                          <div className="flex gap-1.5 overflow-x-auto pb-2">
                            {backgroundStyles.map((style) => (
                              <button
                                key={style.value}
                                onClick={() => setBackgroundColor(style.value)}
                                className={`min-w-[50px] h-10 rounded-lg transition-all hover:scale-105 flex-shrink-0 ${
                                  backgroundColor === style.value
                                    ? 'ring-2 ring-primary ring-offset-1 scale-105'
                                    : 'ring-1 ring-border'
                                }`}
                                style={{ background: style.value }}
                                title={style.name}
                              />
                            ))}
                          </div>
                        </div>
                        
                        {/* Cor personalizada - compacta */}
                        <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg">
                          <Label className="text-xs font-semibold whitespace-nowrap">Personalizada:</Label>
                          <input
                            type="color"
                            value={customColor}
                            onChange={(e) => {
                              setCustomColor(e.target.value);
                              setBackgroundColor(e.target.value);
                            }}
                            className="w-10 h-8 rounded cursor-pointer border border-border"
                          />
                          <Input
                            value={customColor}
                            onChange={(e) => {
                              setCustomColor(e.target.value);
                              setBackgroundColor(e.target.value);
                            }}
                            placeholder="#8B5CF6"
                            className="flex-1 h-8 text-sm bg-background"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-semibold">Seu texto:</Label>
                            {/* Botões de formatação */}
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant={textBold ? "default" : "outline"}
                                onClick={() => setTextBold(!textBold)}
                                className="h-7 w-7 p-0"
                              >
                                <Bold className="w-3 h-3" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={textItalic ? "default" : "outline"}
                                onClick={() => setTextItalic(!textItalic)}
                                className="h-7 w-7 p-0"
                              >
                                <Italic className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <Textarea
                            ref={textareaRef}
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            placeholder="Escreva algo inspirador..."
                            className="min-h-24 text-base resize-none bg-background/50"
                            maxLength={300}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {textContent.length}/300 caracteres
                          </p>
                        </div>

                        {/* Link no texto */}
                        <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                          <Label className="flex items-center gap-2 text-xs font-semibold">
                            <Link2 className="w-3 h-3" />
                            Link no texto (opcional)
                          </Label>
                          <Input
                            value={textLink}
                            onChange={(e) => setTextLink(e.target.value)}
                            placeholder="https://seusite.com"
                            type="url"
                            className="bg-background h-8 text-sm"
                          />
                          <p className="text-xs text-muted-foreground">Abrirá ao clicar no texto</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {mediaPreview ? (
                          <div className="flex gap-2 justify-center p-4 bg-muted/30 rounded-xl">
                            {type === 'image' && (
                              <Button
                                variant="outline"
                                size="lg"
                                onClick={() => {
                                  setShowCropDialog(true);
                                }}
                              >
                                <Crop className="w-4 h-4 mr-2" />
                                Ajustar Crop
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={() => {
                                setMediaFile(null);
                                setMediaPreview('');
                                setOriginalImage('');
                                setCropData(null);
                              }}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Alterar arquivo
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center bg-gradient-to-br from-muted/30 to-transparent hover:border-primary/50 transition-all">
                            <label className="cursor-pointer block group">
                              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Upload className="w-8 h-8 text-purple-500" />
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
                          </div>
                        )}

                        {/* Link opcional para mídia */}
                        <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                          <Label className="flex items-center gap-2 text-xs font-semibold">
                            <LinkIcon className="w-3 h-3" />
                            Link (opcional)
                          </Label>
                          <Input
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="https://seusite.com"
                            type="url"
                            className="bg-background h-8 text-sm"
                          />
                          <p className="text-xs text-muted-foreground">Link para seus seguidores acessarem</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer - Botões fixos */}
              <div className="px-6 py-4 border-t bg-background/95 backdrop-blur-sm flex-shrink-0">
                <div className="flex gap-3">
                  {step === 'create' && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setStep('select');
                        setMediaFile(null);
                        setMediaPreview('');
                        setTextContent('');
                      }} 
                      disabled={currentUpload?.status === 'uploading'}
                      size="lg"
                    >
                      Voltar
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={handleClose} 
                    className="flex-1" 
                    disabled={currentUpload?.status === 'uploading'}
                    size="lg"
                  >
                    Cancelar
                  </Button>
                  {step === 'create' && (
                    <Button 
                      onClick={handlePublish} 
                      className="flex-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white" 
                      disabled={currentUpload?.status === 'uploading'}
                      size="lg"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Publicar Story
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna direita - Preview no celular (sempre visível) */}
            {step === 'create' && (
              <div className="w-80 bg-muted/20 flex items-center justify-center border-l flex-shrink-0">
                <div className="relative">
                  {/* Frame do celular */}
                  <div className="w-64 h-[520px] bg-black rounded-[3rem] p-3 shadow-2xl border-8 border-gray-800">
                    {/* Notch */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10" />
                    
                    {/* Tela do celular */}
                    <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                      {type === 'text' ? (
                        <div
                          className="w-full h-full flex items-center justify-center p-6"
                          style={{ background: backgroundColor }}
                        >
                          <p
                            className={`text-white text-lg text-center break-words leading-relaxed drop-shadow-lg ${
                              textBold ? 'font-bold' : 'font-semibold'
                            } ${
                              textItalic ? 'italic' : ''
                            }`}
                          >
                            {textContent || 'Seu texto aparecerá aqui'}
                          </p>
                        </div>
                      ) : mediaPreview ? (
                        type === 'image' ? (
                          <img
                            src={mediaPreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={mediaPreview}
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                          <p className="text-muted-foreground text-sm text-center px-4">
                            Preview do seu story<br/>aparecerá aqui
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-3">Preview</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Crop */}
      <ImageCropDialog
        open={showCropDialog}
        onClose={() => setShowCropDialog(false)}
        imageSrc={originalImage}
        onCropComplete={handleCroppedImage}
        aspect={9 / 16}
      />
    </>
  );
}
