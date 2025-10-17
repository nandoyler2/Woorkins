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
import { Loader2, Building2, CheckCircle2, XCircle } from 'lucide-react';

interface CreateBusinessProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateBusinessProfileDialog({ open, onOpenChange, onSuccess }: CreateBusinessProfileDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);

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
      const { data, error } = await supabase
        .from('business_profiles')
        .select('slug')
        .eq('slug', slugToCheck)
        .maybeSingle();

      if (error) throw error;
      setSlugAvailable(!data);
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

  const handleCreate = async () => {
    if (!user || !companyName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira o nome do seu perfil profissional',
        variant: 'destructive',
      });
      return;
    }

    if (!slugAvailable) {
      toast({
        title: 'Slug indisponível',
        description: 'Por favor, escolha um @ diferente',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);

    try {
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !profileData) {
        throw new Error('Perfil não encontrado');
      }

      // Create business profile
      const { data: newBusiness, error: createError } = await supabase
        .from('business_profiles')
        .insert({
          profile_id: profileData.id,
          company_name: companyName.trim(),
          slug: slug,
          active: true,
        })
        .select('*')
        .single();

      if (createError || !newBusiness) {
        throw new Error(createError?.message || 'Não foi possível criar o perfil');
      }

      toast({
        title: 'Perfil criado!',
        description: 'Agora você pode configurar seu perfil profissional',
      });

      onSuccess?.();
      onOpenChange(false);
      setCompanyName('');
      setSlug('');
      setSlugAvailable(null);
      navigate(`/empresa/${newBusiness.slug}/editar`);
      
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Criar Perfil Profissional
          </DialogTitle>
          <DialogDescription>
            Escolha um nome para o seu novo perfil profissional. Você poderá personalizá-lo depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nome do Perfil *</Label>
            <Input
              id="company-name"
              placeholder="Ex: Minha Empresa, João Silva - Freelancer"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !creating && slugAvailable) {
                  handleCreate();
                }
              }}
              maxLength={100}
              disabled={creating}
            />
            <p className="text-xs text-muted-foreground">
              Este nome será exibido no seu perfil público
            </p>
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
                disabled={creating}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingSlug && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!checkingSlug && slugAvailable === true && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {!checkingSlug && slugAvailable === false && (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {slugAvailable === false && (
                <span className="text-red-500">Este @ já está em uso. Escolha outro.</span>
              )}
              {slugAvailable === true && (
                <span className="text-green-500">Este @ está disponível!</span>
              )}
              {slugAvailable === null && slug && (
                <span>Seu perfil ficará disponível em: woorkins.com/empresa/@{slug}</span>
              )}
              {!slug && (
                <span>O @ é gerado automaticamente baseado no nome</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !companyName.trim() || !slugAvailable || checkingSlug}
            className="flex-1"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Perfil'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
