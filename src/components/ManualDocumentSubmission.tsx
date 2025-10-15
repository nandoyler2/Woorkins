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
  onSuccess?: () => void;
}

export function ManualDocumentSubmission({
  open,
  onOpenChange,
  profileId,
  onSuccess
}: ManualDocumentSubmissionProps) {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [socialMediaLink, setSocialMediaLink] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
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
      if (!userId) throw new Error('Usuário não autenticado');

      const timestamp = Date.now();

      // Upload frente
      const frontExt = frontFile.name.split('.').pop();
      const { data: frontUpload, error: frontError } = await supabase.storage
        .from('identity-documents')
        .upload(`${userId}/manual_front_${timestamp}.${frontExt}`, frontFile);

      if (frontError) throw frontError;

      // Upload verso
      const backExt = backFile.name.split('.').pop();
      const { data: backUpload, error: backError } = await supabase.storage
        .from('identity-documents')
        .upload(`${userId}/manual_back_${timestamp}.${backExt}`, backFile);

      if (backError) throw backError;

      // Upload selfie
      const selfieExt = selfieFile.name.split('.').pop();
      const { data: selfieUpload, error: selfieError } = await supabase.storage
        .from('identity-documents')
        .upload(`${userId}/manual_selfie_${timestamp}.${selfieExt}`, selfieFile);

      if (selfieError) throw selfieError;

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
          whatsapp_number: whatsappNumber
        });

      if (dbError) throw dbError;

      setSubmitted(true);
      toast({
        title: 'Documentos enviados!',
        description: 'Sua solicitação será analisada manualmente pela nossa equipe. Aguarde o contato via WhatsApp.',
      });

      if (onSuccess) onSuccess();

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
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle className="h-16 w-16 text-green-600" />
            <div className="text-center space-y-2">
              <p className="font-semibold">Solicitação recebida com sucesso!</p>
              <p className="text-sm text-muted-foreground">
                Nossa equipe irá analisar seus documentos manualmente e entrar em contato via WhatsApp em até 48 horas úteis.
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full mt-4">
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
            Faça upload dos seus documentos para análise manual pela nossa equipe
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Frente do Documento */}
          <div className="space-y-2">
            <Label htmlFor="front">
              Frente do Documento (RG ou CNH) <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="front"
                type="file"
                accept="image/*"
                onChange={(e) => setFrontFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              {frontFile && <CheckCircle className="h-5 w-5 text-green-600" />}
            </div>
          </div>

          {/* Verso do Documento */}
          <div className="space-y-2">
            <Label htmlFor="back">
              Verso do Documento <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="back"
                type="file"
                accept="image/*"
                onChange={(e) => setBackFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              {backFile && <CheckCircle className="h-5 w-5 text-green-600" />}
            </div>
          </div>

          {/* Selfie */}
          <div className="space-y-2">
            <Label htmlFor="selfie">
              Foto Atual Sua (Selfie) <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="selfie"
                type="file"
                accept="image/*"
                onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              {selfieFile && <CheckCircle className="h-5 w-5 text-green-600" />}
            </div>
          </div>

          {/* Link Rede Social */}
          <div className="space-y-2">
            <Label htmlFor="social">
              Link de Rede Social (Instagram, Facebook, etc)
            </Label>
            <Input
              id="social"
              type="url"
              placeholder="https://instagram.com/seuperfil"
              value={socialMediaLink}
              onChange={(e) => setSocialMediaLink(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Opcional: Link para rede social com fotos suas para validação adicional
            </p>
          </div>

          {/* WhatsApp */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp">
              Número do WhatsApp <span className="text-destructive">*</span>
            </Label>
            <Input
              id="whatsapp"
              type="tel"
              placeholder="(11) 99999-9999"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Para entrarmos em contato sobre a verificação
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Importante:</strong> Nossa equipe irá analisar manualmente seus documentos e entrar em contato via WhatsApp em até 48 horas úteis.
            </p>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !frontFile || !backFile || !selfieFile || !whatsappNumber}
            className="w-full"
            size="lg"
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
      </DialogContent>
    </Dialog>
  );
}
