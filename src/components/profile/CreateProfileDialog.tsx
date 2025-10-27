import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIdentifierValidation } from '@/hooks/useIdentifierValidation';
import { normalizeIdentifier } from '@/lib/identifierValidation';
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
import { Loader2, Check, X } from 'lucide-react';

interface CreateProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProfileDialog({ open, onOpenChange }: CreateProfileDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isChecking, checkAvailability, validateIdentifier } = useIdentifierValidation();

  const [creating, setCreating] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  const generateSlug = (name: string) => {
    const normalized = normalizeIdentifier(name);
    setSlug(normalized);
    checkSlugAvailability(normalized);
  };

  const checkSlugAvailability = async (value: string) => {
    if (!value || value.length < 3) {
      setSlugAvailable(null);
      return;
    }

    const validation = validateIdentifier(value);
    if (!validation.valid) {
      setSlugAvailable(false);
      return;
    }

    const available = await checkAvailability(value);
    setSlugAvailable(available);
  };

  const handleSlugChange = (value: string) => {
    const normalized = normalizeIdentifier(value);
    setSlug(normalized);
    checkSlugAvailability(normalized);
  };

  const handleCreate = async () => {
    if (!user || !companyName || !slug) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos',
        variant: 'destructive'
      });
      return;
    }

    if (!slugAvailable) {
      toast({
        title: 'Identificador indisponível',
        description: 'Escolha um identificador diferente',
        variant: 'destructive'
      });
      return;
    }

    setCreating(true);

    try {
      // Criar perfil
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          profile_type: 'business',
          company_name: companyName,
          slug: slug,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      toast({
        title: 'Perfil criado com sucesso!',
        description: 'Você será redirecionado para as configurações.'
      });

      onOpenChange(false);
      navigate(`/settings/profile/${newProfile.id}`);
    } catch (error: any) {
      console.error('Erro ao criar perfil:', error);
      toast({
        title: 'Erro ao criar perfil',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Perfil</DialogTitle>
          <DialogDescription>
            Crie um perfil profissional adicional para gerenciar sua presença online.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da Empresa *</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                if (!slug) generateSlug(e.target.value);
              }}
              placeholder="Minha Empresa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Identificador (URL) *</Label>
            <div className="relative">
              <Input
                id="slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="minha-empresa"
              />
              {isChecking && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!isChecking && slug.length >= 3 && slugAvailable === true && (
                <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />
              )}
              {!isChecking && slug.length >= 3 && slugAvailable === false && (
                <X className="absolute right-3 top-3 h-4 w-4 text-red-500" />
              )}
            </div>
            {slug && slug.length >= 3 && (
              <p className="text-sm text-muted-foreground">
                Seu perfil será: /{slug}
              </p>
            )}
            {slugAvailable === false && (
              <p className="text-sm text-red-500">
                Este identificador já está em uso
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !companyName || !slug || !slugAvailable}
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Perfil
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
