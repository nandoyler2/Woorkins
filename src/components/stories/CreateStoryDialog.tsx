import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageIcon, Video, Type, Upload, Loader2, Camera, Bold, Italic, Crop, CheckCircle, Pencil, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { useUpload } from '@/contexts/UploadContext';
import { formatShortName } from '@/lib/utils';
import { StoryStickers, Sticker } from '@/components/stories/StoryStickers';

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

  // Resetar selectedProfile quando o diálogo abrir ou profiles mudarem
  useEffect(() => {
    if (isOpen && profiles.length > 0 && !selectedProfile) {
      setSelectedProfile(profiles[0].id);
    }
  }, [isOpen, profiles, selectedProfile]);
  const [backgroundColor, setBackgroundColor] = useState(backgroundStyles[0].value);
  const [customColor, setCustomColor] = useState('#8B5CF6');
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [cropData, setCropData] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });
  const [textScale, setTextScale] = useState(1);
  const [mediaPosition, setMediaPosition] = useState({ x: 50, y: 50 });
  const [mediaScale, setMediaScale] = useState(1);
  const [mediaInteracted, setMediaInteracted] = useState(false);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { uploadStory, currentUpload } = useUpload();

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Detectar se é imagem ou vídeo pelo tipo do arquivo
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast({
        title: 'Formato inválido',
        description: 'Selecione uma imagem ou vídeo',
        variant: 'destructive',
      });
      return;
    }

    // Definir o tipo baseado no arquivo
    setType(isImage ? 'image' : 'video');

    const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Arquivo muito grande',
        description: `O arquivo deve ter no máximo ${isImage ? '10' : '50'}MB`,
        variant: 'destructive',
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    
    // Se for imagem, guardar original e abrir crop
    if (isImage) {
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

  const handleTypeSelect = (selectedType: 'media' | 'text') => {
    if (selectedType === 'media') {
      setType('image'); // Default para imagem, será ajustado no handleMediaChange
      setStep('create');
      // Abrir o seletor de arquivo automaticamente
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    } else {
      setType('text');
      setStep('create');
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

    // Verificar se o perfil tem foto de perfil
    const currentProfile = profiles.find(p => p.id === selectedProfile);
    if (!currentProfile?.avatar_url) {
      toast({
        title: 'Foto de perfil obrigatória',
        description: 'Você precisa adicionar uma foto de perfil antes de postar stories',
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

    // Fechar dialog imediatamente
    handleClose();
    onStoryCreated();

    // Upload continua em background
    const hasCustomMediaPositioning = type !== 'text' && (
      mediaInteracted || mediaScale !== 1 || mediaPosition.x !== 50 || mediaPosition.y !== 50
    );

    uploadStory({
      profileId: selectedProfile,
      type: type,
      mediaFile: finalMediaFile || undefined,
      textContent: type === 'text' ? textContent : undefined,
      backgroundColor: type === 'text' ? backgroundColor : undefined,
      textPosition: type === 'text' ? textPosition : undefined,
      textScale: type === 'text' ? textScale : undefined,
      mediaPosition: hasCustomMediaPositioning ? mediaPosition : undefined,
      mediaScale: hasCustomMediaPositioning ? mediaScale : undefined,
      metadata,
      stickers: stickers.map(s => ({
        type: s.type,
        position_x: s.position_x,
        position_y: s.position_y,
        width: s.width,
        height: s.height,
        rotation: s.rotation,
        content: s.content,
        scale: s.scale || 1
      }))
    }).catch(error => {
      // Erros já são tratados no uploadStory
      console.error('Story upload failed:', error);
    });
  };

  const handleClose = () => {
    setStep('select');
    setMediaFile(null);
    setMediaPreview('');
    setOriginalImage('');
    setCropData(null);
    setTextContent('');
    setType('image');
    setTextBold(false);
    setTextItalic(false);
    setStickers([]);
    setTextPosition({ x: 50, y: 50 });
    setTextScale(1);
    setMediaPosition({ x: 50, y: 50 });
    setMediaScale(1);
    setMediaInteracted(false);
    setDraggedElement(null);
    onClose();
  };

  const handleAddSticker = (sticker: Omit<Sticker, 'id'>) => {
    const newSticker = {
      ...sticker,
      id: `sticker-${Date.now()}-${Math.random()}`
    };
    setStickers(prev => [...prev, newSticker]);
  };

  const handleRemoveSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateSticker = (id: string, updates: Partial<Sticker>) => {
    setStickers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleDragStart = (element: string) => {
    if (element === 'media') setMediaInteracted(true);
    setDraggedElement(element);
  };

  const handleDrag = (e: React.MouseEvent, element: string, containerRef: HTMLDivElement) => {
    if (!draggedElement) return;
    
    const rect = containerRef.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (element === 'text') {
      setTextPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    } else if (element === 'media') {
      setMediaPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    } else if (element.startsWith('sticker-')) {
      const stickerId = element.replace('sticker-', '');
      handleUpdateSticker(stickerId, { 
        position_x: Math.max(0, Math.min(100, x)), 
        position_y: Math.max(0, Math.min(100, y)) 
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className={`${step === 'select' ? 'max-w-2xl' : 'max-w-6xl'} ${step === 'select' ? 'h-auto' : 'h-[90vh]'} p-0 gap-0 border-l-8 border-l-gradient-to-b from-purple-500 via-pink-500 to-orange-500 transition-all duration-300`}>
          <div className="flex h-full overflow-hidden">
            {/* Coluna esquerda - Header, Formulário e Botões */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header - apenas no step create */}
              {step === 'create' && (
                <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-background via-background to-muted/20 flex-shrink-0">
                  <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                    Criar Storie
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">Compartilhe um momento especial</DialogDescription>
                </DialogHeader>
              )}

              {/* Formulário - Scrollable */}
              <div className={`flex-1 overflow-y-auto overflow-x-hidden px-6 ${step === 'select' ? 'py-8' : 'py-6'} min-h-0`}>
                {step === 'select' ? (
                  <div className="space-y-6">
                    {/* Seleção de perfil (se tiver múltiplos) */}
                    {profiles.length > 1 && (
                      <div className="space-y-3 bg-muted/30 p-4 rounded-xl">
                        <Label className="text-sm font-semibold">Postar como:</Label>
                        <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                          <SelectTrigger className="bg-background">
                            <SelectValue>
                              {formatShortName(profiles.find(p => p.id === selectedProfile)?.full_name || '') || profiles.find(p => p.id === selectedProfile)?.username || ''}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-background border z-50">
                            {profiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {formatShortName(profile.full_name) || profile.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Pergunta inicial */}
                    <div className="text-center py-8">
                      <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                        {(() => {
                          const currentProfile = profiles.find(p => p.id === selectedProfile);
                          if (!currentProfile) return 'O que irá publicar no seu storie?';
                          
                          const fullName = currentProfile.full_name || currentProfile.username || '';
                          const firstName = fullName.split(' ')[0];
                          const formattedName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
                          return `${formattedName}, o que irá publicar no seu storie?`;
                        })()}
                      </h3>
                      <p className="text-muted-foreground mb-8">Use o storie para postar conteúdos profissionais sobre você</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        {/* Opção Mídia (Imagem ou Vídeo) */}
                        <button
                          onClick={() => handleTypeSelect('media')}
                          className="group relative p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-pink-500/5 hover:from-purple-500/20 hover:via-pink-500/20 hover:to-pink-500/10 border-2 border-purple-500/30 hover:border-pink-500 transition-all hover:scale-105"
                        >
                          <div className="flex gap-2 justify-center mb-4">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                              <ImageIcon className="w-6 h-6 text-purple-500" />
                            </div>
                            <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Video className="w-6 h-6 text-pink-500" />
                            </div>
                          </div>
                          <h4 className="font-bold text-lg mb-1">Imagem ou Vídeo</h4>
                          <p className="text-sm text-muted-foreground">Compartilhe algo profissional</p>
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
                          <div className="flex gap-1.5 overflow-x-auto pb-2 px-2 py-2">
                            {backgroundStyles.map((style) => (
                              <button
                                key={style.value}
                                onClick={() => setBackgroundColor(style.value)}
                                className={`min-w-[50px] h-10 rounded-lg transition-all hover:scale-105 flex-shrink-0 ${
                                  backgroundColor === style.value
                                    ? 'ring-2 ring-primary ring-offset-2 scale-105'
                                    : 'ring-1 ring-border'
                                }`}
                                style={{ background: style.value }}
                                title={style.name}
                              />
                            ))}
                            
                            {/* Cor personalizada inline com label */}
                            <div className="relative flex-shrink-0 flex flex-col items-center gap-1">
                              <input
                                type="color"
                                value={customColor}
                                onChange={(e) => {
                                  setCustomColor(e.target.value);
                                  setBackgroundColor(e.target.value);
                                }}
                                className="w-[50px] h-10 rounded-lg cursor-pointer border-2 border-border hover:border-primary transition-all"
                                title="Cor personalizada"
                              />
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                                <Pencil className="w-3 h-3" />
                                <span>Personalize...</span>
                              </div>
                            </div>
                          </div>
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

                        {/* Stickers interativos */}
                        <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                          <Label className="text-sm font-semibold">Adicionar figurinhas interativas:</Label>
                          <StoryStickers
                            stickers={stickers}
                            onAddSticker={handleAddSticker}
                            onRemoveSticker={handleRemoveSticker}
                          />
                          {stickers.length > 0 && (
                            <div className="space-y-1 mt-2">
                              <p className="text-xs text-muted-foreground">
                                Figurinhas adicionadas:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {stickers.map((sticker) => (
                                  <div
                                    key={sticker.id}
                                    className="flex items-center gap-1 bg-background px-2 py-1 rounded text-xs"
                                  >
                                    <span className="capitalize">{sticker.type === 'poll' ? 'Enquete' : sticker.type === 'emoji' ? 'Emoji' : 'Link'}</span>
                                    <button
                                      onClick={() => handleRemoveSticker(sticker.id)}
                                      className="text-destructive hover:text-destructive/80"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {mediaPreview ? (
                          <div className="space-y-3">
                            {/* Info sobre mídia carregada */}
                            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                                  {type === 'image' ? 'Imagem carregada!' : 'Vídeo carregado!'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {mediaFile?.name}
                                </p>
                              </div>
                            </div>
                            
                            {/* Botões de controle */}
                            <div className="flex gap-2 justify-center">
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
                                  setTimeout(() => {
                                    fileInputRef.current?.click();
                                  }, 100);
                                }}
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Alterar arquivo
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center bg-gradient-to-br from-muted/30 to-transparent hover:border-primary/50 transition-all">
                            <label className="cursor-pointer block group">
                              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Upload className="w-8 h-8 text-purple-500" />
                              </div>
                              <h3 className="text-lg font-semibold mb-2">Selecione uma foto ou vídeo</h3>
                              <p className="text-sm text-muted-foreground mb-1">
                                Imagens: JPG, PNG, WEBP ou GIF (máx. 10MB)
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Vídeos: MP4, WEBM ou MOV (máx. 50MB)
                              </p>
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
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

                        {/* Stickers interativos para mídia */}
                        {mediaPreview && (
                          <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                            <Label className="text-sm font-semibold">Adicionar figurinhas interativas:</Label>
                            <StoryStickers
                              stickers={stickers}
                              onAddSticker={handleAddSticker}
                              onRemoveSticker={handleRemoveSticker}
                            />
                            {stickers.length > 0 && (
                              <div className="space-y-1 mt-2">
                                <p className="text-xs text-muted-foreground">
                                  Figurinhas adicionadas:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {stickers.map((sticker) => (
                                    <div
                                      key={sticker.id}
                                      className="flex items-center gap-1 bg-background px-2 py-1 rounded text-xs"
                                    >
                                      <span className="capitalize">{sticker.type === 'poll' ? 'Enquete' : sticker.type === 'emoji' ? 'Emoji' : 'Link'}</span>
                                      <button
                                        onClick={() => handleRemoveSticker(sticker.id)}
                                        className="text-destructive hover:text-destructive/80"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer - Botões fixos */}
              <div className="px-6 py-4 border-t bg-background flex-shrink-0 sticky bottom-0 z-10">
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
                      disabled={isPublishing}
                      size="lg"
                    >
                      Voltar
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={handleClose} 
                    className="flex-1" 
                    disabled={isPublishing}
                    size="lg"
                  >
                    {step === 'select' ? 'Fechar' : 'Cancelar'}
                  </Button>
                  {step === 'create' && (
                    <Button 
                      onClick={handlePublish} 
                      className="flex-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white" 
                      disabled={isPublishing}
                      size="lg"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Verificando conteúdo...
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5 mr-2" />
                          Publicar Storie
                        </>
                      )}
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
                    <div 
                      className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative cursor-move"
                      onMouseMove={(e) => draggedElement && handleDrag(e, draggedElement, e.currentTarget as HTMLDivElement)}
                      onMouseUp={() => setDraggedElement(null)}
                      onMouseLeave={() => setDraggedElement(null)}
                    >
                      {type === 'text' ? (
                        <div
                          className="w-full h-full flex items-center justify-center p-6 relative"
                          style={{ background: backgroundColor }}
                        >
                          <div
                            className="absolute cursor-move select-none"
                            style={{
                              left: `${textPosition.x}%`,
                              top: `${textPosition.y}%`,
                              transform: `translate(-50%, -50%) scale(${textScale})`,
                            }}
                            onMouseDown={() => handleDragStart('text')}
                            onWheel={(e) => {
                              e.preventDefault();
                              setTextScale(prev => Math.max(0.5, Math.min(2, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
                            }}
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
                          
                          {/* Stickers no preview de texto */}
                          {stickers.map((sticker) => (
                            <div
                              key={sticker.id}
                              className="absolute cursor-move select-none"
                              style={{
                                left: `${sticker.position_x}%`,
                                top: `${sticker.position_y}%`,
                                transform: `translate(-50%, -50%) scale(${sticker.scale || 1})`,
                              }}
                              onMouseDown={() => handleDragStart(`sticker-${sticker.id}`)}
                              onWheel={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleUpdateSticker(sticker.id, {
                                  scale: Math.max(0.5, Math.min(2, (sticker.scale || 1) + (e.deltaY > 0 ? -0.1 : 0.1)))
                                });
                              }}
                            >
                              {sticker.type === 'poll' ? (
                                <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[200px]">
                                  <p className="text-white font-bold text-sm mb-3">{sticker.content.question}</p>
                                  <div className="space-y-2">
                                    {sticker.content.options?.map((option: any) => (
                                      <div
                                        key={option.id}
                                        className="bg-white/20 hover:bg-white/30 transition rounded-full px-4 py-2"
                                      >
                                        <p className="text-white text-xs font-medium text-center">{option.text}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : sticker.type === 'emoji' ? (
                                <span className="text-4xl hover:scale-110 transition">{sticker.content.emoji}</span>
                              ) : sticker.type === 'link' ? (
                                <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 flex items-center gap-2">
                                  <span className="text-xl">🔗</span>
                                  <span className="text-white text-sm font-medium">{sticker.content.title}</span>
                                </div>
                              ) : null}
                            </div>
                          ))}
                          
                          {/* Instrução */}
                          <div className="absolute bottom-2 left-0 right-0 text-center">
                            <p className="text-white/70 text-[8px] drop-shadow">
                              Arraste para mover • Scroll para redimensionar
                            </p>
                          </div>
                        </div>
                      ) : mediaPreview ? (
                        <div className="w-full h-full relative bg-black">
                          <div
                            className="absolute cursor-move"
                            style={{
                              left: `${mediaPosition.x}%`,
                              top: `${mediaPosition.y}%`,
                              transform: `translate(-50%, -50%) scale(${mediaScale})`,
                              width: '100%',
                              height: '100%',
                            }}
                            onMouseDown={() => handleDragStart('media')}
                            onWheel={(e) => {
                              e.preventDefault();
                              setMediaInteracted(true);
                              setMediaScale(prev => Math.max(0.5, Math.min(2, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
                            }}
                          >
                            {type === 'image' ? (
                              <img
                                src={mediaPreview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <video
                                src={mediaPreview}
                                controls
                                muted
                                autoPlay
                                loop
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          
                          {/* Stickers no preview */}
                          {stickers.map((sticker) => (
                            <div
                              key={sticker.id}
                              className="absolute cursor-move select-none"
                              style={{
                                left: `${sticker.position_x}%`,
                                top: `${sticker.position_y}%`,
                                transform: `translate(-50%, -50%) scale(${sticker.scale || 1})`,
                              }}
                              onMouseDown={() => handleDragStart(`sticker-${sticker.id}`)}
                              onWheel={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleUpdateSticker(sticker.id, {
                                  scale: Math.max(0.5, Math.min(2, (sticker.scale || 1) + (e.deltaY > 0 ? -0.1 : 0.1)))
                                });
                              }}
                            >
                              {sticker.type === 'poll' ? (
                                <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[200px]">
                                  <p className="text-white font-bold text-sm mb-3">{sticker.content.question}</p>
                                  <div className="space-y-2">
                                    {sticker.content.options?.map((option: any) => (
                                      <div
                                        key={option.id}
                                        className="bg-white/20 hover:bg-white/30 transition rounded-full px-4 py-2"
                                      >
                                        <p className="text-white text-xs font-medium text-center">{option.text}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : sticker.type === 'emoji' ? (
                                <span className="text-4xl hover:scale-110 transition">{sticker.content.emoji}</span>
                              ) : sticker.type === 'link' ? (
                                <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 flex items-center gap-2">
                                  <span className="text-xl">🔗</span>
                                  <span className="text-white text-sm font-medium">{sticker.content.title}</span>
                                </div>
                              ) : null}
                            </div>
                          ))}
                          
                          {/* Instrução */}
                          <div className="absolute bottom-2 left-0 right-0 text-center">
                            <p className="text-white/70 text-[8px] drop-shadow">
                              Arraste para mover • Scroll para redimensionar
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                          <p className="text-muted-foreground text-sm text-center px-4">
                            Preview do seu storie<br/>aparecerá aqui
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
