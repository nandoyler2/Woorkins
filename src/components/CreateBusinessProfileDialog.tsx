import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { 
  Loader2, Building2, CheckCircle2, XCircle, Upload, Camera,
  MessageSquare, Globe, ImageIcon, Play, ShoppingBag, ThumbsUp,
  Award, Calendar, Link as LinkIcon, Briefcase as BriefcaseIcon,
  ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';

interface CreateBusinessProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type WizardStep = 'photo' | 'tools' | 'cover' | 'final';

interface FeatureOption {
  key: string;
  name: string;
  description: string;
  icon: any;
}

const availableFeatures: FeatureOption[] = [
  { key: 'negotiation', name: 'Negociação', description: 'Sistema de negociação com clientes', icon: MessageSquare },
  { key: 'social', name: 'Redes Sociais', description: 'Links para redes sociais', icon: Globe },
  { key: 'portfolio', name: 'Portfólio', description: 'Galeria de trabalhos', icon: ImageIcon },
  { key: 'video', name: 'Vídeo', description: 'Vídeo de apresentação', icon: Play },
  { key: 'catalog', name: 'Catálogo', description: 'Produtos e serviços', icon: ShoppingBag },
  { key: 'testimonials', name: 'Depoimentos', description: 'Avaliações de clientes', icon: ThumbsUp },
  { key: 'certifications', name: 'Certificações', description: 'Certificados e prêmios', icon: Award },
  { key: 'appointments', name: 'Agendamento', description: 'Sistema de agendas', icon: Calendar },
  { key: 'linktree', name: 'Links', description: 'Múltiplos links externos', icon: LinkIcon },
  { key: 'vacancies', name: 'Vagas', description: 'Vagas de emprego', icon: BriefcaseIcon },
];

export function CreateBusinessProfileDialog({ open, onOpenChange, onSuccess }: CreateBusinessProfileDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Step control
  const [currentStep, setCurrentStep] = useState<WizardStep>('photo');
  const [creating, setCreating] = useState(false);
  
  // Step 1: Photo & Basic Info
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  
  // Step 2: Features
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  
  // Step 3: Cover & Info
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  };

  const checkSlugAvailability = async (slugToCheck: string) => {
    if (!slugToCheck) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    try {
      // Verificar se existe como slug de outro business (excluindo perfis deletados)
      const { data: existingSlug, error: slugError } = await supabase
        .from('profiles')
        .select('slug')
        .eq('slug', slugToCheck)
        .eq('profile_type', 'business')
        .neq('deleted', true) // Ignorar perfis excluídos
        .maybeSingle();

      if (slugError) throw slugError;

      if (existingSlug) {
        setSlugAvailable(false);
        setCheckingSlug(false);
        return;
      }

      // Verificar se conflita com username de algum perfil user (excluindo perfis deletados)
      const { data: existingUsername, error: usernameError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', slugToCheck)
        .neq('deleted', true) // Ignorar perfis excluídos
        .maybeSingle();

      if (usernameError) throw usernameError;

      setSlugAvailable(!existingUsername);
    } catch (error) {
      console.error('Error checking slug:', error);
      setSlugAvailable(null);
    } finally {
      setCheckingSlug(false);
    }
  };

  useEffect(() => {
    if (companyName) {
      const newSlug = generateSlug(companyName);
      setSlug(newSlug);
    } else {
      setSlug('');
      setSlugAvailable(null);
    }
  }, [companyName]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (slug) {
        checkSlugAvailability(slug);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [slug]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleFeature = (key: string) => {
    setSelectedFeatures(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const getStepProgress = () => {
    const steps: WizardStep[] = ['photo', 'tools', 'cover', 'final'];
    return ((steps.indexOf(currentStep) + 1) / steps.length) * 100;
  };

  const canProceedFromStep = () => {
    if (currentStep === 'photo') {
      return companyName.trim() && slug && slugAvailable;
    }
    return true;
  };

  const handleNext = () => {
    if (!canProceedFromStep()) return;
    
    const stepOrder: WizardStep[] = ['photo', 'tools', 'cover', 'final'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder: WizardStep[] = ['photo', 'tools', 'cover', 'final'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleFinish = async () => {
    if (!user || !companyName.trim() || !slugAvailable) return;

    setCreating(true);

    try {
      console.log('🔄 Iniciando criação de perfil profissional...');
      
      // Liberar identificador se pertencer a perfil excluído
      console.log('🔄 Liberando identificador de perfis excluídos...');
      await supabase.rpc('free_identifier_if_owner_deleted', { p_identifier: slug });
      
      // Criar NOVO perfil profissional
      console.log('🔄 Criando novo perfil profissional...');
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          profile_type: 'business',
          slug: slug,
          company_name: companyName.trim(),
          category: category || null,
          bio: description || null,
        })
        .select('*')
        .single();

      console.log('✅ newProfile:', newProfile);
      console.log('❌ insertError:', insertError);

      if (insertError) {
        console.error('❌ Erro ao criar perfil:', insertError);
        throw new Error(insertError.message || 'Não foi possível criar o perfil');
      }

      if (!newProfile) {
        console.error('❌ newProfile está vazio');
        throw new Error('Perfil criado está vazio');
      }

      if (!newProfile.slug) {
        console.error('❌ slug não foi salvo no perfil:', newProfile);
        throw new Error('Erro ao salvar o @ do perfil');
      }

      let logoUrl = null;
      let coverUrl = null;

      // Upload logo usando o user_id (necessário para as políticas de storage)
      if (logoFile) {
        console.log('📤 Iniciando upload do logo...');
        const compressed = await compressImage(logoFile, { maxSizeMB: 1, maxWidth: 800, maxHeight: 800 });
        const logoPath = `${user.id}/logo-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(logoPath, compressed);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('profile-photos')
            .getPublicUrl(logoPath);
          logoUrl = publicUrl;
          console.log('✅ Logo uploaded:', logoUrl);
        } else {
          console.error('❌ Erro ao fazer upload do logo:', uploadError);
        }
      }

      // Upload cover usando o user_id (necessário para as políticas de storage)
      if (coverFile) {
        const compressed = await compressImage(coverFile, { maxSizeMB: 2, maxWidth: 1920, maxHeight: 1080 });
        const coverPath = `${user.id}/cover-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(coverPath, compressed);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('profile-photos')
            .getPublicUrl(coverPath);
          coverUrl = publicUrl;
        }
      }

      // Atualizar perfil com URLs das imagens
      if (logoUrl || coverUrl) {
        console.log('🔄 Atualizando perfil com imagens:', { logoUrl, coverUrl });
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            logo_url: logoUrl,
            cover_url: coverUrl,
          })
          .eq('id', newProfile.id);

        if (updateError) {
          console.error('❌ Erro ao atualizar imagens:', updateError);
          throw new Error('Erro ao salvar imagens do perfil');
        }
        console.log('✅ Perfil atualizado com imagens!');
      }

      // Ativar features selecionadas para o NOVO perfil
      if (selectedFeatures.length > 0) {
        const featuresToInsert = selectedFeatures.map(key => ({
          profile_id: newProfile.id,
          feature_key: key,
          is_active: true,
        }));

        await supabase
          .from('profile_features')
          .insert(featuresToInsert);
      }

      console.log('✅ Perfil criado com sucesso!');
      
      toast({
        title: 'Perfil criado com sucesso!',
        description: 'Seu perfil profissional está pronto',
      });

      // Aguardar um momento para garantir que o banco propagou as mudanças
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setCurrentStep('photo');
      setLogoFile(null);
      setLogoPreview('');
      setCoverFile(null);
      setCoverPreview('');
      setCompanyName('');
      setSlug('');
      setSlugAvailable(null);
      setSelectedFeatures([]);
      setCategory('');
      setDescription('');
      
      console.log('🔄 Navegando para:', `/perfil/editar?businessId=${newProfile.id}`);
      navigate(`/perfil/editar?businessId=${newProfile.id}`);
      
    } catch (error: any) {
      console.error('Error creating business profile:', error);
      toast({
        title: 'Erro ao criar perfil',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'photo':
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-32 h-32">
                <AvatarImage src={logoPreview} />
                <AvatarFallback className="bg-muted">
                  <Camera className="w-12 h-12 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('logo-input')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {logoPreview ? 'Trocar Foto' : 'Adicionar Foto'}
                </Button>
                <input
                  id="logo-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <p className="text-xs text-muted-foreground">Recomendado: 400x400px</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-name">Nome do Perfil *</Label>
              <Input
                id="company-name"
                placeholder="Ex: Minha Empresa, João Silva"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">@ do Perfil *</Label>
              <div className="relative">
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    const newSlug = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '')
                      .slice(0, 50);
                    setSlug(newSlug);
                  }}
                  placeholder="seu-perfil"
                  className="font-mono"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingSlug && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {!checkingSlug && slugAvailable === true && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {!checkingSlug && slugAvailable === false && <XCircle className="h-4 w-4 text-red-500" />}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {slugAvailable === false && <span className="text-destructive">Este @ já está em uso</span>}
                {slugAvailable === true && <span className="text-green-500">Disponível!</span>}
                {slugAvailable === null && slug && <span>woorkins.com/@{slug}</span>}
              </p>
            </div>
          </div>
        );

      case 'tools':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Escolha as ferramentas que deseja ativar no seu perfil
            </p>
            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
              {availableFeatures.map((feature) => (
                <Card
                  key={feature.key}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedFeatures.includes(feature.key)
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => toggleFeature(feature.key)}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <feature.icon className={`w-8 h-8 ${
                      selectedFeatures.includes(feature.key) ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <div>
                      <p className="font-medium text-sm">{feature.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{feature.description}</p>
                    </div>
                    {selectedFeatures.includes(feature.key) && (
                      <Check className="w-4 h-4 text-primary absolute top-2 right-2" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'cover':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Imagem de Capa</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {coverPreview ? (
                  <div className="relative">
                    <img src={coverPreview} alt="Capa" className="w-full h-40 object-cover rounded" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => document.getElementById('cover-input')?.click()}
                    >
                      Trocar Capa
                    </Button>
                  </div>
                ) : (
                  <div className="py-8">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('cover-input')?.click()}
                    >
                      Adicionar Capa
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">Recomendado: 1920x400px</p>
                  </div>
                )}
                <input
                  id="cover-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                placeholder="Ex: Desenvolvimento, Design, Consultoria"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Conte um pouco sobre seu trabalho..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
        );

      case 'final':
        return (
          <div className="space-y-4 text-center py-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Tudo Pronto!</h3>
              <p className="text-sm text-muted-foreground">
                Seu perfil profissional está configurado e pronto para ser publicado
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm">Nome: {companyName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm">URL: @{slug}</span>
              </div>
              {selectedFeatures.length > 0 && (
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span className="text-sm">{selectedFeatures.length} ferramentas ativadas</span>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden max-h-[90vh] flex flex-col" hideClose>
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-blue-900 via-teal-700 to-blue-900 p-4 border-b shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-lg font-bold">
              <Building2 className="w-5 h-5" />
              Criar Perfil Profissional
            </DialogTitle>
            <DialogDescription className="text-blue-100 text-sm mt-1">
              {currentStep === 'photo' && 'Comece com a foto e informações básicas'}
              {currentStep === 'tools' && 'Escolha as ferramentas para o seu perfil'}
              {currentStep === 'cover' && 'Adicione uma capa e informações adicionais'}
              {currentStep === 'final' && 'Revise e finalize seu perfil'}
            </DialogDescription>
          </DialogHeader>
          <Progress value={getStepProgress()} className="h-1.5 mt-3 bg-blue-950/50" />
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {renderStepContent()}
        </div>

        {/* Footer fixo com botões */}
        <div className="border-t bg-gradient-to-b from-muted/30 to-muted/50 px-5 py-3 shrink-0">
          <div className="flex gap-2 items-center justify-between">
            <div className="flex gap-2">
              {currentStep !== 'photo' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={creating}
                  className="h-9 text-sm"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
              )}
              
              {currentStep !== 'final' && currentStep !== 'photo' && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={creating}
                  className="h-9 text-sm"
                >
                  Pular
                </Button>
              )}
              
              {currentStep === 'photo' && (
                <Button
                  type="button"
                  onClick={onOpenChange.bind(null, false)}
                  variant="outline"
                  className="h-9 text-sm"
                >
                  Cancelar
                </Button>
              )}
            </div>
            
            <div>
              {currentStep !== 'final' ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceedFromStep() || creating}
                  className="h-9 text-sm bg-gradient-to-r from-blue-600 via-teal-600 to-blue-600 hover:from-blue-700 hover:via-teal-700 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleFinish}
                  disabled={creating}
                  className="h-9 text-sm bg-green-700 hover:bg-green-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Finalizar
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
