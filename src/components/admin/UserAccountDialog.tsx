import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SafeImage } from '@/components/ui/safe-image';
import { User, Mail, Calendar, MapPin, FileText, Upload, Save } from 'lucide-react';
import { formatFullName } from '@/lib/utils';

interface UserAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    user_id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    cpf: string | null;
    birth_date: string | null;
    location: string | null;
    bio: string | null;
    filiation: string | null;
    nationality: string | null;
    place_of_birth: string | null;
    document_verified: boolean;
    approved_document: any;
  };
  onUpdate: () => void;
}

export function UserAccountDialog({ open, onOpenChange, user, onUpdate }: UserAccountDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    location: user.location || '',
    bio: user.bio || '',
    filiation: user.filiation || '',
    nationality: user.nationality || '',
    place_of_birth: user.place_of_birth || '',
  });

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      // Validar tipo e tamanho
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Erro',
          description: 'Por favor, selecione uma imagem',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Erro',
          description: 'A imagem deve ter no máximo 5MB',
          variant: 'destructive',
        });
        return;
      }

      // Upload para o storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.user_id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Atualizar perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Sucesso',
        description: 'Foto de perfil atualizada',
      });

      onUpdate();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Erro ao fazer upload',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          location: formData.location,
          bio: formData.bio,
          filiation: formData.filiation,
          nationality: formData.nationality,
          place_of_birth: formData.place_of_birth,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Informações atualizadas com sucesso',
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conta do Usuário</DialogTitle>
          <DialogDescription>
            Visualize e edite as informações da conta de {formatFullName(user.full_name)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Foto de Perfil */}
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <Avatar className="h-20 w-20">
              {user.avatar_url ? (
                <SafeImage src={user.avatar_url} alt={user.full_name} className="object-cover" />
              ) : (
                <AvatarFallback className="text-2xl">
                  {formatFullName(user.full_name).charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button type="button" variant="outline" disabled={uploading} asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Enviando...' : 'Alterar Foto'}
                  </span>
                </Button>
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG ou WEBP. Máximo 5MB.
              </p>
            </div>
          </div>

          {/* Informações Pessoais */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Informações Pessoais
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={`@${user.username}`} disabled />
              </div>

              <div className="space-y-2">
                <Label>CPF</Label>
                <Input 
                  value={user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'Não informado'} 
                  disabled 
                />
              </div>

              <div className="space-y-2">
                <Label>
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Data de Nascimento
                </Label>
                <Input 
                  value={user.birth_date ? new Date(user.birth_date).toLocaleDateString('pt-BR') : 'Não informado'} 
                  disabled 
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Localização
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Cidade, Estado"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Sobre você..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Informações do Documento (Apenas Exibição para Admin) */}
          {user.approved_document && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Informações Extraídas do Documento
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Filiação</Label>
                  <Input
                    value={formData.filiation}
                    onChange={(e) => setFormData({ ...formData, filiation: e.target.value })}
                    placeholder="Nome da mãe/pai"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Naturalidade</Label>
                  <Input
                    value={formData.place_of_birth}
                    onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                    placeholder="Cidade/Estado de nascimento"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Nacionalidade</Label>
                  <Input
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    placeholder="País"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
