import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IdentityVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  registeredName: string;
  registeredCPF: string;
  onVerificationComplete?: () => void;
}

type UploadOption = 'combined' | 'front' | 'back';

export function IdentityVerificationDialog({
  open,
  onOpenChange,
  profileId,
  registeredName,
  registeredCPF,
  onVerificationComplete
}: IdentityVerificationDialogProps) {
  const [uploadOption, setUploadOption] = useState<UploadOption | null>(null);
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [combinedImage, setCombinedImage] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'combined') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'front') setFrontImage(file);
    else if (type === 'back') setBackImage(file);
    else setCombinedImage(file);
  };

  const handleSubmit = async () => {
    if (!uploadOption) return;
    
    // Validar se os arquivos necessários foram enviados
    if (uploadOption === 'combined' && !combinedImage) {
      toast.error('Por favor, envie o documento completo (frente e verso)');
      return;
    }
    
    if (uploadOption === 'front' && !frontImage) {
      toast.error('Por favor, envie a frente do documento');
      return;
    }
    
    if (uploadOption === 'back' && !backImage) {
      toast.error('Por favor, envie o verso do documento');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const timestamp = Date.now();
      
      const uploadFile = async (file: File, fileName: string) => {
        const { data, error } = await supabase.storage
          .from('identity-documents')
          .upload(`${profileId}/${fileName}_${timestamp}.jpg`, file);
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('identity-documents')
          .getPublicUrl(data.path);
        
        return publicUrl;
      };

      let frontUrl = '';
      let backUrl = '';

      if (uploadOption === 'combined' && combinedImage) {
        // Se é documento combinado, usar a mesma imagem para frente e verso
        frontUrl = await uploadFile(combinedImage, 'document_combined');
        backUrl = frontUrl;
      } else {
        if (frontImage) frontUrl = await uploadFile(frontImage, 'document_front');
        if (backImage) backUrl = await uploadFile(backImage, 'document_back');
      }

      // Call verification function sem selfie
      const { data, error } = await supabase.functions.invoke('verify-identity-document', {
        body: {
          frontImageUrl: frontUrl,
          backImageUrl: backUrl,
          profileId,
          registeredName,
          registeredCPF
        }
      });

      if (error) throw error;

      // Save verification result
      const { error: dbError } = await supabase
        .from('document_verifications')
        .insert({
          profile_id: profileId,
          document_front_url: frontUrl,
          document_back_url: backUrl,
          selfie_url: null,
          verification_status: data.status,
          verification_result: data,
          ai_analysis: data.aiAnalysis,
          extracted_name: data.extractedData?.name,
          extracted_cpf: data.extractedData?.cpf,
          extracted_birth_date: data.extractedData?.birthDate
        });

      if (dbError) throw dbError;

      setVerificationResult(data);
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error('Erro ao processar verificação: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderContent = () => {
    if (isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-center">Processando documentos e validando informações...</p>
          <p className="text-sm text-muted-foreground text-center">Isso pode levar alguns segundos</p>
        </div>
      );
    }

    if (verificationResult) {
      const isApproved = verificationResult.status === 'approved';
      
      return (
        <div className="space-y-6 p-6">
          <div className={`flex items-center gap-3 p-4 rounded-lg ${isApproved ? 'bg-green-50' : 'bg-red-50'}`}>
            {isApproved ? (
              <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600" />
            )}
            <div>
              <h3 className={`font-semibold ${isApproved ? 'text-green-900' : 'text-red-900'}`}>
                {isApproved ? 'Verificação Aprovada!' : 'Verificação Rejeitada'}
              </h3>
              <p className={`text-sm ${isApproved ? 'text-green-700' : 'text-red-700'}`}>
                {isApproved 
                  ? 'Seu documento foi verificado com sucesso'
                  : 'Não foi possível verificar seu documento'}
              </p>
            </div>
          </div>

          {!isApproved && verificationResult.rejectionReasons && (
            <div className="bg-amber-50 p-4 rounded-lg">
              <h4 className="font-semibold text-amber-900 mb-2">Motivos:</h4>
              <ul className="list-disc list-inside space-y-1">
                {verificationResult.rejectionReasons.map((reason: string, idx: number) => (
                  <li key={idx} className="text-sm text-amber-700">{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {verificationResult.extractedData && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Dados Extraídos:</h4>
              <div className="space-y-1 text-sm text-blue-700">
                {verificationResult.extractedData.name && (
                  <p><strong>Nome:</strong> {verificationResult.extractedData.name}</p>
                )}
                {verificationResult.extractedData.cpf && (
                  <p><strong>CPF:</strong> {verificationResult.extractedData.cpf}</p>
                )}
                {verificationResult.extractedData.birthDate && (
                  <p><strong>Data de Nascimento:</strong> {verificationResult.extractedData.birthDate}</p>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={() => {
              if (isApproved && onVerificationComplete) {
                onVerificationComplete();
              }
              onOpenChange(false);
            }}
            className="w-full"
          >
            {isApproved ? 'Continuar' : 'Tentar Novamente'}
          </Button>
        </div>
      );
    }

    if (!uploadOption) {
      return (
        <div className="space-y-6 p-6">
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">Como deseja enviar seu documento?</h3>
            <p className="text-sm text-muted-foreground">
              Escolha a opção que preferir para enviar seu RG ou CNH
            </p>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => setUploadOption('combined')}
            >
              <Upload className="h-6 w-6" />
              <div>
                <p className="font-semibold">Documento Completo</p>
                <p className="text-xs text-muted-foreground">Frente e verso em uma única imagem</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => setUploadOption('front')}
            >
              <Upload className="h-6 w-6" />
              <div>
                <p className="font-semibold">Apenas Frente</p>
                <p className="text-xs text-muted-foreground">Enviar somente a frente do documento</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => setUploadOption('back')}
            >
              <Upload className="h-6 w-6" />
              <div>
                <p className="font-semibold">Apenas Verso</p>
                <p className="text-xs text-muted-foreground">Enviar somente o verso do documento</p>
              </div>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 p-6">
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-lg">
            {uploadOption === 'combined' && 'Envie o documento completo'}
            {uploadOption === 'front' && 'Envie a frente do documento'}
            {uploadOption === 'back' && 'Envie o verso do documento'}
          </h3>
          <p className="text-sm text-muted-foreground">
            Tire uma foto ou selecione uma imagem do seu RG ou CNH
          </p>
        </div>

        <div className="space-y-4">
          {uploadOption === 'combined' && (
            <div>
              <label className="block mb-2 text-sm font-medium">Documento Completo (Frente e Verso)</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileChange(e, 'combined')}
                className="w-full"
              />
              {combinedImage && (
                <p className="mt-2 text-sm text-green-600">✓ Arquivo selecionado: {combinedImage.name}</p>
              )}
            </div>
          )}

          {uploadOption === 'front' && (
            <div>
              <label className="block mb-2 text-sm font-medium">Frente do Documento</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileChange(e, 'front')}
                className="w-full"
              />
              {frontImage && (
                <p className="mt-2 text-sm text-green-600">✓ Arquivo selecionado: {frontImage.name}</p>
              )}
            </div>
          )}

          {uploadOption === 'back' && (
            <div>
              <label className="block mb-2 text-sm font-medium">Verso do Documento</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileChange(e, 'back')}
                className="w-full"
              />
              {backImage && (
                <p className="mt-2 text-sm text-green-600">✓ Arquivo selecionado: {backImage.name}</p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUploadOption(null);
                setFrontImage(null);
                setBackImage(null);
                setCombinedImage(null);
              }}
              className="flex-1"
            >
              Voltar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                (uploadOption === 'combined' && !combinedImage) ||
                (uploadOption === 'front' && !frontImage) ||
                (uploadOption === 'back' && !backImage)
              }
              className="flex-1"
            >
              Enviar e Verificar
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verificação de Identidade</DialogTitle>
          <DialogDescription>
            Envie seu RG ou CNH para verificação
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
