import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ManualDocumentSubmissionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  onSubmitSuccess?: () => void;
}

export function ManualDocumentSubmission({
  open,
  onOpenChange,
  profileId,
  onSubmitSuccess
}: ManualDocumentSubmissionProps) {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [socialMediaLink, setSocialMediaLink] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!frontFile || !backFile || !selfieFile || !whatsappNumber) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const timestamp = Date.now();

      // Upload files
      const { data: frontUpload, error: frontError } = await supabase.storage
        .from('identity-documents')
        .upload(`${userId}/manual_front_${timestamp}.jpg`, frontFile);

      const { data: backUpload, error: backError } = await supabase.storage
        .from('identity-documents')
        .upload(`${userId}/manual_back_${timestamp}.jpg`, backFile);

      const { data: selfieUpload, error: selfieError } = await supabase.storage
        .from('identity-documents')
        .upload(`${userId}/manual_selfie_${timestamp}.jpg`, selfieFile);

      if (frontError || backError || selfieError) {
        throw new Error('Erro ao fazer upload das imagens');
      }

      // Get public URLs
      const { data: { publicUrl: frontUrl } } = supabase.storage
        .from('identity-documents')
        .getPublicUrl(frontUpload.path);

      const { data: { publicUrl: backUrl } } = supabase.storage
        .from('identity-documents')
        .getPublicUrl(backUpload.path);

      const { data: { publicUrl: selfieUrl } } = supabase.storage
        .from('identity-documents')
        .getPublicUrl(selfieUpload.path);

      // Save submission
      const { error: dbError } = await supabase
        .from('manual_document_submissions')
        .insert({
          profile_id: profileId,
          document_front_url: frontUrl,
          document_back_url: backUrl,
          selfie_url: selfieUrl,
          social_media_link: socialMediaLink || null,
          whatsapp_number: whatsappNumber,
          status: 'pending'
        });

      if (dbError) throw dbError;

      setSubmitted(true);
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }

      toast({
        title: 'Documentos enviados!',
        description: 'Nossa equipe irá analisar seus documentos em breve.',
      });

    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Ocorreu um erro ao enviar seus documentos. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Documentos Enviados!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Recebemos seus documentos!</h3>
              <p className="text-sm text-muted-foreground">
                Nossa equipe irá analisar suas informações em até 24 horas úteis.
                Você receberá uma notificação assim que a análise for concluída.
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Documentos Manualmente</DialogTitle>
          <DialogDescription>
            Nossa equipe irá analisar seus documentos manualmente. Isso pode levar até 24 horas úteis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="front" className="flex items-center gap-2">
              Frente do Documento <span className="text-red-500">*</span>
            </Label>
            <Input
              id="front"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, setFrontFile)}
              required
            />
            {frontFile && (
              <p className="text-xs text-green-600">✓ {frontFile.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="back" className="flex items-center gap-2">
              Verso do Documento <span className="text-red-500">*</span>
            </Label>
            <Input
              id="back"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, setBackFile)}
              required
            />
            {backFile && (
              <p className="text-xs text-green-600">✓ {backFile.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="selfie" className="flex items-center gap-2">
              Foto Atual (Selfie) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="selfie"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, setSelfieFile)}
              required
            />
            {selfieFile && (
              <p className="text-xs text-green-600">✓ {selfieFile.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="social">Link de Rede Social (Instagram, Facebook, etc.)</Label>
            <Input
              id="social"
              type="url"
              placeholder="https://instagram.com/seu_usuario"
              value={socialMediaLink}
              onChange={(e) => setSocialMediaLink(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Link para perfil com fotos suas (ajuda na verificação)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="flex items-center gap-2">
              WhatsApp <span className="text-red-500">*</span>
            </Label>
            <Input
              id="whatsapp"
              type="tel"
              placeholder="(11) 99999-9999"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Para contato caso necessário
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Atenção:</strong> Certifique-se de que:
            </p>
            <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
              <li>As fotos estejam nítidas e legíveis</li>
              <li>Seu documento seja original (RG ou CNH)</li>
              <li>A selfie mostre claramente seu rosto</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar Documentos
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
