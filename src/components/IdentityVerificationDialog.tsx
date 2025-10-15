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
  const [needsSecondPart, setNeedsSecondPart] = useState(false);
  const [preValidation, setPreValidation] = useState<any>(null);
  const [isPreValidating, setIsPreValidating] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'combined') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'front') setFrontImage(file);
    else if (type === 'back') setBackImage(file);
    else setCombinedImage(file);

    // Fazer pré-validação do documento
    await preValidateDocument(file, type);
  };

  const preValidateDocument = async (file: File, type: 'front' | 'back' | 'combined') => {
    setIsPreValidating(true);
    setPreValidation(null);

    try {
      // Converter arquivo para base64
      const base64 = await fileToBase64(file);

      const documentSide = type === 'combined' ? 'front' : type;

      const { data, error } = await supabase.functions.invoke('validate-document-realtime', {
        body: { 
          imageBase64: base64,
          documentSide 
        }
      });

      if (error) throw error;

      setPreValidation({
        type,
        result: data,
        isValid: data.isValid
      });

      if (!data.isValid) {
        toast.error(`Documento inválido: ${data.issues.join(', ')}`);
      } else {
        toast.success(`✓ ${type === 'front' ? 'Frente' : type === 'back' ? 'Verso' : 'Documento'} validado com sucesso!`);
      }
    } catch (error) {
      console.error('Pre-validation error:', error);
      toast.error('Erro ao validar documento');
    } finally {
      setIsPreValidating(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleContinueToSecondPart = () => {
    if (uploadOption === 'front' && frontImage) {
      setNeedsSecondPart(true);
    } else if (uploadOption === 'back' && backImage) {
      setNeedsSecondPart(true);
    }
  };

  const handleSubmit = async () => {
    if (!uploadOption) return;
    
    // Para opções separadas que ainda precisam da segunda parte
    if ((uploadOption === 'front' && frontImage && !backImage) || 
        (uploadOption === 'back' && backImage && !frontImage)) {
      handleContinueToSecondPart();
      return;
    }
    if (!uploadOption) return;
    
    // Validar se os arquivos necessários foram enviados
    if (uploadOption === 'combined' && !combinedImage) {
      toast.error('Por favor, envie o documento completo (frente e verso)');
      return;
    }
    
    // Para opções separadas, precisa ter ambas as partes
    if ((uploadOption === 'front' || uploadOption === 'back') && (!frontImage || !backImage)) {
      // Se tem só uma parte, pedir a outra
      if (frontImage && !backImage) {
        setNeedsSecondPart(true);
        return;
      }
      if (backImage && !frontImage) {
        setNeedsSecondPart(true);
        return;
      }
      toast.error('Por favor, envie frente e verso do documento');
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
            {uploadOption === 'front' && (needsSecondPart ? 'Agora envie o verso do documento' : 'Envie a frente do documento')}
            {uploadOption === 'back' && (needsSecondPart ? 'Agora envie a frente do documento' : 'Envie o verso do documento')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {needsSecondPart 
              ? 'Para completar a verificação, precisamos da outra parte do documento'
              : 'Tire uma foto ou selecione uma imagem do seu RG ou CNH'}
          </p>
        </div>

        <div className="space-y-4">
          {preValidation && (
            <div className={`p-3 rounded-lg ${preValidation.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                {preValidation.isValid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <p className={`text-sm font-medium ${preValidation.isValid ? 'text-green-900' : 'text-red-900'}`}>
                  {preValidation.isValid ? 'Documento válido' : 'Documento inválido'}
                </p>
              </div>
              {preValidation.result?.issues && preValidation.result.issues.length > 0 && (
                <ul className="mt-2 text-xs text-red-700 list-disc list-inside">
                  {preValidation.result.issues.map((issue: string, idx: number) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              )}
              {preValidation.result?.suggestions && preValidation.result.suggestions.length > 0 && (
                <ul className="mt-2 text-xs text-amber-700 list-disc list-inside">
                  {preValidation.result.suggestions.map((suggestion: string, idx: number) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

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

          {(uploadOption === 'front' || (uploadOption === 'back' && needsSecondPart)) && (
            <div>
              <label className="block mb-2 text-sm font-medium">Frente do Documento</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileChange(e, 'front')}
                className="w-full"
                disabled={!!frontImage || isPreValidating}
              />
              {frontImage && (
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-sm text-green-600">✓ Arquivo selecionado: {frontImage.name}</p>
                  {!needsSecondPart && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setFrontImage(null);
                        setPreValidation(null);
                      }}
                    >
                      Trocar
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {(uploadOption === 'back' || (uploadOption === 'front' && needsSecondPart)) && (
            <div>
              <label className="block mb-2 text-sm font-medium">Verso do Documento</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileChange(e, 'back')}
                className="w-full"
                disabled={!!backImage || isPreValidating}
              />
              {backImage && (
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-sm text-green-600">✓ Arquivo selecionado: {backImage.name}</p>
                  {!needsSecondPart && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setBackImage(null);
                        setPreValidation(null);
                      }}
                    >
                      Trocar
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (needsSecondPart) {
                  // Voltar para primeira parte
                  setNeedsSecondPart(false);
                  if (uploadOption === 'front') setBackImage(null);
                  if (uploadOption === 'back') setFrontImage(null);
                  setPreValidation(null);
                } else {
                  // Voltar para seleção de opção
                  setUploadOption(null);
                  setFrontImage(null);
                  setBackImage(null);
                  setCombinedImage(null);
                  setPreValidation(null);
                }
              }}
              className="flex-1"
            >
              Voltar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isPreValidating ||
                (uploadOption === 'combined' && !combinedImage) ||
                ((uploadOption === 'front' || uploadOption === 'back') && (!frontImage || !backImage)) ||
                (preValidation && !preValidation.isValid)
              }
              className="flex-1"
            >
              {isPreValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  {(frontImage && backImage) || combinedImage ? 'Enviar e Verificar' : 
                   frontImage && !needsSecondPart ? 'Continuar para Verso' :
                   backImage && !needsSecondPart ? 'Continuar para Frente' :
                   'Selecionar Arquivo'}
                </>
              )}
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
