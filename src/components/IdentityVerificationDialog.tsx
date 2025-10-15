import { useState, useRef, useEffect } from 'react';
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

type UploadOption = 'combined' | 'separate';

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
  const [preValidationFront, setPreValidationFront] = useState<any>(null);
  const [preValidationBack, setPreValidationBack] = useState<any>(null);
  const [isPreValidating, setIsPreValidating] = useState(false);
  const combinedInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'combined') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'front') {
      setFrontImage(file);
      await preValidateDocument(file, 'front');
    } else if (type === 'back') {
      setBackImage(file);
      await preValidateDocument(file, 'back');
    } else {
      setCombinedImage(file);
      await preValidateDocument(file, 'combined');
      // Para documento combinado, verificar automaticamente após pré-validação
      setTimeout(() => processVerification(file, file), 100);
    }
  };

  // Auto-submit quando ambas as imagens forem selecionadas (modo separate)
  useEffect(() => {
    if (uploadOption === 'separate' && frontImage && backImage && 
        preValidationFront?.isValid && preValidationBack?.isValid && !isProcessing) {
      processVerification(frontImage, backImage);
    }
  }, [frontImage, backImage, preValidationFront, preValidationBack, uploadOption, isProcessing]);

  const preValidateDocument = async (file: File, type: 'front' | 'back' | 'combined') => {
    setIsPreValidating(true);

    try {
      const base64 = await fileToBase64(file);
      const documentSide = type === 'combined' ? 'front' : type;

      const { data, error } = await supabase.functions.invoke('validate-document-realtime', {
        body: { 
          imageBase64: base64,
          documentSide 
        }
      });

      if (error) throw error;

      const validationResult = {
        type,
        result: data,
        isValid: data.isValid
      };

      if (type === 'front') {
        setPreValidationFront(validationResult);
      } else if (type === 'back') {
        setPreValidationBack(validationResult);
      }

      if (!data.isValid) {
        toast.error(`Documento inválido: ${data.issues.join(', ')}`);
      } else {
        toast.success(`✓ ${type === 'front' ? 'Frente' : type === 'back' ? 'Verso' : 'Documento'} validado!`);
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

  const processVerification = async (frontFile: File, backFile: File) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const timestamp = Date.now();
      
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');
      
      const uploadFile = async (file: File, fileName: string) => {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('identity-documents')
          .upload(`${profile.id}/${fileName}_${timestamp}.jpg`, file);
        
        if (uploadError) throw uploadError;
        
        // Bucket é privado: gerar URL assinada para a Edge Function conseguir baixar
        const { data: signedData, error: signedError } = await supabase.storage
          .from('identity-documents')
          .createSignedUrl(uploadData.path, 60 * 10); // 10 minutos
        
        if (signedError) throw signedError;
        
        return signedData.signedUrl;
      };

      let frontUrl = '';
      let backUrl = '';

      if (uploadOption === 'combined') {
        frontUrl = await uploadFile(frontFile, 'document_combined');
        backUrl = frontUrl;
      } else {
        frontUrl = await uploadFile(frontFile, 'document_front');
        backUrl = await uploadFile(backFile, 'document_back');
      }

      // Call verification function
      const { data, error } = await supabase.functions.invoke('verify-identity-document', {
        body: {
          frontImageUrl: frontUrl,
          backImageUrl: backUrl,
          profileId: profile.id,
          registeredName,
          registeredCPF
        }
      });

      if (error) throw error;

      // Edge function já salva o resultado da verificação
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
            <h3 className="font-semibold text-lg">Escolha a opção que preferir para enviar seu RG ou CNH</h3>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setUploadOption('combined');
                setTimeout(() => combinedInputRef.current?.click(), 100);
              }}
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
              onClick={() => setUploadOption('separate')}
            >
              <Upload className="h-6 w-6" />
              <div>
                <p className="font-semibold">Frente e Verso</p>
                <p className="text-xs text-muted-foreground">Enviar frente e verso separadamente</p>
              </div>
            </Button>
          </div>
          
          {/* Hidden inputs */}
          <input
            ref={combinedInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileChange(e, 'combined')}
            className="hidden"
          />
        </div>
      );
    }

    return (
      <div className="space-y-6 p-6">
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-lg">
            {uploadOption === 'combined' ? 'Processando documento...' : 'Envie frente e verso do documento'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {uploadOption === 'combined' 
              ? 'Aguarde enquanto validamos seu documento' 
              : 'Tire fotos claras de ambos os lados do seu RG ou CNH'}
          </p>
        </div>

        {uploadOption === 'separate' && (
          <div className="grid grid-cols-2 gap-4">
            {/* Frente */}
            <div className="space-y-2">
              <div 
                className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  frontImage 
                    ? preValidationFront?.isValid 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-primary'
                }`}
                onClick={() => !frontImage && frontInputRef.current?.click()}
              >
                {frontImage ? (
                  <div className="space-y-2">
                    {preValidationFront?.isValid ? (
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-600 mx-auto" />
                    )}
                    <p className="text-sm font-medium">
                      {preValidationFront?.isValid ? '✓ Frente validada' : '✗ Frente inválida'}
                    </p>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFrontImage(null);
                        setPreValidationFront(null);
                      }}
                    >
                      Trocar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">Frente do Documento</p>
                    <p className="text-xs text-muted-foreground">Clique para selecionar</p>
                  </div>
                )}
              </div>
              {preValidationFront?.result?.issues && preValidationFront.result.issues.length > 0 && (
                <ul className="text-xs text-red-600 list-disc list-inside">
                  {preValidationFront.result.issues.slice(0, 2).map((issue: string, idx: number) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Verso */}
            <div className="space-y-2">
              <div 
                className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  backImage 
                    ? preValidationBack?.isValid 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-primary'
                }`}
                onClick={() => !backImage && backInputRef.current?.click()}
              >
                {backImage ? (
                  <div className="space-y-2">
                    {preValidationBack?.isValid ? (
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-600 mx-auto" />
                    )}
                    <p className="text-sm font-medium">
                      {preValidationBack?.isValid ? '✓ Verso validado' : '✗ Verso inválido'}
                    </p>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBackImage(null);
                        setPreValidationBack(null);
                      }}
                    >
                      Trocar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">Verso do Documento</p>
                    <p className="text-xs text-muted-foreground">Clique para selecionar</p>
                  </div>
                )}
              </div>
              {preValidationBack?.result?.issues && preValidationBack.result.issues.length > 0 && (
                <ul className="text-xs text-red-600 list-disc list-inside">
                  {preValidationBack.result.issues.slice(0, 2).map((issue: string, idx: number) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Status de processamento automático */}
        {((uploadOption === 'separate' && frontImage && backImage && preValidationFront?.isValid && preValidationBack?.isValid) || 
          (uploadOption === 'combined' && combinedImage)) && !isProcessing && (
          <div className="text-center text-sm text-muted-foreground">
            Verificação iniciará automaticamente...
          </div>
        )}

        {/* Hidden inputs */}
        <input
          ref={frontInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFileChange(e, 'front')}
          className="hidden"
        />
        <input
          ref={backInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFileChange(e, 'back')}
          className="hidden"
        />

        <Button
          variant="outline"
          onClick={() => {
            setUploadOption(null);
            setFrontImage(null);
            setBackImage(null);
            setCombinedImage(null);
            setPreValidationFront(null);
            setPreValidationBack(null);
          }}
          className="w-full"
        >
          Voltar
        </Button>
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
