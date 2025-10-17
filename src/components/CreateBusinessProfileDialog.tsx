import { useState } from 'react';
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
import { Loader2, Building2 } from 'lucide-react';

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
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!user || !companyName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira o nome do seu perfil profissional',
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

      // Generate unique slug
      const baseSlug = companyName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const newSlug = `${baseSlug}-${randomSuffix}`;

      // Create business profile
      const { data: newBusiness, error: createError } = await supabase
        .from('business_profiles')
        .insert({
          profile_id: profileData.id,
          company_name: companyName.trim(),
          slug: newSlug,
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
                if (e.key === 'Enter' && !creating) {
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
            disabled={creating || !companyName.trim()}
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
