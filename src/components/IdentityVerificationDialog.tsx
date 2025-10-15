import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, CheckCircle, XCircle, AlertCircle, FileText, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ManualDocumentSubmission } from './ManualDocumentSubmission';
import { SupportChatDialog } from './SupportChatDialog';

interface IdentityVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  registeredName: string;
  registeredCPF: string;
  onVerificationComplete?: () => void;
}

type Step = 'intro' | 'front' | 'front-preview' | 'back' | 'back-preview' | 'selfie' | 'selfie-preview' | 'processing' | 'result';

interface ValidationFeedback {
  isValid: boolean;
  quality: 'excellent' | 'good' | 'acceptable' | 'poor';
  issues: string[];
  suggestions: string[];
}

export function IdentityVerificationDialog({
  open,
  onOpenChange,
  profileId,
  registeredName,
  registeredCPF,
  onVerificationComplete
}: IdentityVerificationDialogProps) {
  const [step, setStep] = useState<Step>('intro');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [realtimeValidation, setRealtimeValidation] = useState<ValidationFeedback | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [canCapture, setCanCapture] = useState(false);
  const [showManualSubmission, setShowManualSubmission] = useState(false);
  const [manualFallbackVisible, setManualFallbackVisible] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const validationIntervalRef = useRef<number | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      console.log('Tentando ativar câmera...');
      setManualFallbackVisible(false);
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Seu navegador não suporta acesso à câmera');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      console.log('Stream obtido:', stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready and play
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata carregado');
          videoRef.current?.play()
            .then(() => {
              console.log('Video reproduzindo');
              setIsCameraActive(true);
              
              // Iniciar validação em tempo real após câmera ativar
              setTimeout(() => {
                const interval = setInterval(() => {
                  validateDocumentRealtime();
                }, 2000);
                validationIntervalRef.current = interval as any;
              }, 500);
            })
            .catch((playError) => {
              console.error('Erro ao reproduzir video:', playError);
              toast({
                title: 'Erro ao iniciar câmera',
                description: 'Não foi possível iniciar a visualização da câmera',
                variant: 'destructive'
              });
            });
        };
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      
      let errorMessage = 'Permita o acesso à câmera para continuar';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Você negou o acesso à câmera. Por favor, permita nas configurações do navegador.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'Nenhuma câmera encontrada no seu dispositivo.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'A câmera já está em uso por outro aplicativo.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Erro ao acessar câmera',
        description: errorMessage,
        variant: 'destructive'
      });
      
      // Habilitar opção de upload manual (sem abrir automaticamente)
      setManualFallbackVisible(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCameraActive(false);
    }
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current);
      validationIntervalRef.current = null;
    }
    setRealtimeValidation(null);
    setCanCapture(false);
  };

  const validateDocumentRealtime = async () => {
    if (!videoRef.current || !isCameraActive || isValidating) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

    setIsValidating(true);

    try {
      const documentSide = step === 'front' ? 'front' : step === 'back' ? 'back' : 'selfie';
      
      console.log('Validando documento em tempo real:', documentSide);
      
      // Timeout de 3 segundos para validação
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const validationPromise = supabase.functions.invoke('validate-document-realtime', {
        body: { imageBase64, documentSide }
      });

      const { data, error } = await Promise.race([validationPromise, timeoutPromise]) as any;

      if (error) throw error;

      console.log('Resultado da validação:', data);
      setRealtimeValidation(data);
      setCanCapture(data.isValid);
    } catch (error) {
      console.error('Erro na validação em tempo real:', error);
      // Em caso de erro ou timeout, seja LENIENTE e permita captura
      setRealtimeValidation({
        isValid: true,
        quality: 'good',
        issues: [],
        suggestions: []
      });
      setCanCapture(true);
    } finally {
      setIsValidating(false);
    }
  };

  // Garantir câmera ativa nas etapas e reanexar stream ao trocar de etapa
  useEffect(() => {
    const isLiveStep = step === 'front' || step === 'back' || step === 'selfie';

    // Limpa qualquer validação anterior ao mudar de etapa
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current);
      validationIntervalRef.current = null;
    }

    if (isLiveStep) {
      // Se já existe stream, reanexar ao novo elemento de vídeo
      if (streamRef.current && videoRef.current) {
        (videoRef.current as any).srcObject = streamRef.current;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => setIsCameraActive(true))
            .catch(() => setIsCameraActive(true));
        };
      } else {
        // Se não há stream, tentar iniciar a câmera
        startCamera();
      }

      // Reiniciar feedback e validação contínua
      setRealtimeValidation(null);
      setCanCapture(false);

      const interval = window.setInterval(() => {
        validateDocumentRealtime();
      }, 2000);
      validationIntervalRef.current = interval as any;
    }

    return () => {
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current);
        validationIntervalRef.current = null;
      }
    };
  }, [step]);

  const capturePhoto = () => {
    if (!videoRef.current) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.95);
    }
    
    return null;
  };

  const handleCapture = () => {
    const photo = capturePhoto();
    if (!photo) return;

    // NÃO parar a câmera - manter ativa para próxima foto
    // stopCamera(); // REMOVIDO

    if (step === 'front') {
      setFrontImage(photo);
      setStep('front-preview');
    } else if (step === 'back') {
      setBackImage(photo);
      setStep('back-preview');
    } else if (step === 'selfie') {
      setSelfieImage(photo);
      setStep('selfie-preview');
      // Só parar a câmera após última foto
      stopCamera();
    }
  };

  const handleContinueFromPreview = () => {
    if (step === 'front-preview') {
      setStep('back');
      // Câmera já está ativa, só resetar feedback
      setRealtimeValidation(null);
      setCanCapture(false);
    } else if (step === 'back-preview') {
      setStep('selfie');
      // Câmera já está ativa, só resetar feedback
      setRealtimeValidation(null);
      setCanCapture(false);
    } else if (step === 'selfie-preview') {
      handleSubmit(frontImage!, backImage!, selfieImage!);
    }
  };

  const handleRetakePhoto = () => {
    if (step === 'front-preview') {
      setFrontImage(null);
      setStep('front');
      // Câmera já está ativa, só resetar feedback
      setRealtimeValidation(null);
      setCanCapture(false);
    } else if (step === 'back-preview') {
      setBackImage(null);
      setStep('back');
      // Câmera já está ativa, só resetar feedback
      setRealtimeValidation(null);
      setCanCapture(false);
    } else if (step === 'selfie-preview') {
      setSelfieImage(null);
      setStep('selfie');
      // Reativar câmera já que foi parada após selfie
      startCamera();
      setTimeout(() => {
        const interval = setInterval(() => {
          validateDocumentRealtime();
        }, 2000);
        validationIntervalRef.current = interval as any;
      }, 500);
    }
  };

  const handleSubmit = async (front: string, back: string, selfie: string) => {
    setStep('processing');

    try {
      // Upload images to storage
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      // Get current profile photo URL
      const { data: profileData } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', profileId)
        .single();

      const currentProfilePhotoUrl = profileData?.avatar_url || null;

      const timestamp = Date.now();
      
      const frontBlob = await fetch(front).then(r => r.blob());
      const backBlob = await fetch(back).then(r => r.blob());
      const selfieBlob = await fetch(selfie).then(r => r.blob());

      const { data: frontUpload, error: frontError } = await supabase.storage
        .from('identity-documents')
        .upload(`${userId}/front_${timestamp}.jpg`, frontBlob);

      const { data: backUpload, error: backError } = await supabase.storage
        .from('identity-documents')
        .upload(`${userId}/back_${timestamp}.jpg`, backBlob);

      const { data: selfieUpload, error: selfieError } = await supabase.storage
        .from('identity-documents')
        .upload(`${userId}/selfie_${timestamp}.jpg`, selfieBlob);

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

      // Call verification function
      const { data, error } = await supabase.functions.invoke('verify-identity-document', {
        body: {
          documentFrontBase64: front,
          documentBackBase64: back,
          selfieBase64: selfie,
          profileId,
          registeredName,
          registeredCPF,
          currentProfilePhotoUrl
        }
      });

      if (error) throw error;

      // Save verification record
      const { error: dbError } = await supabase
        .from('document_verifications')
        .upsert({
          profile_id: profileId,
          document_front_url: frontUrl,
          document_back_url: backUrl,
          selfie_url: selfieUrl,
          extracted_name: data.extractedData?.fullName,
          extracted_cpf: data.extractedData?.cpf,
          extracted_birth_date: data.extractedData?.birthDate,
          verification_status: data.status,
          verification_result: data,
          ai_analysis: data.analysis,
          verified_at: data.status === 'approved' ? new Date().toISOString() : null
        });

      if (dbError) {
        console.error('Error saving verification:', dbError);
      }

      setVerificationResult(data);
      setStep('result');

      if (data.status === 'approved' && onVerificationComplete) {
        onVerificationComplete();
      }

    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: 'Erro na verificação',
        description: 'Ocorreu um erro ao processar seus documentos. Tente novamente.',
        variant: 'destructive'
      });
      setStep('intro');
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="space-y-4">
            <DialogDescription>
              Para criar projetos e enviar mensagens, você precisa verificar sua identidade.
            </DialogDescription>
            <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Você vai precisar:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Seu RG ou CNH (documento original)</li>
                <li>Câmera do dispositivo (não é permitido upload de fotos)</li>
                <li>Boa iluminação</li>
              </ul>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-amber-600">Importante:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-amber-600">
                <li>As fotos devem ser tiradas NA HORA (câmera ao vivo)</li>
                <li>O nome e CPF devem ser exatamente iguais ao seu cadastro</li>
                <li>Todas as informações devem estar legíveis</li>
              </ul>
            </div>
            <Button onClick={() => setStep('front')} className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Iniciar Verificação
            </Button>
          </div>
        );

      case 'front':
      case 'back':
      case 'selfie':
        const instructions = {
          front: {
            title: 'Foto da FRENTE do Documento',
            subtitle: 'Mostre o documento para a câmera. Quando tudo estiver verde, você pode capturar.',
            details: 'Certifique-se de que Nome, CPF e Foto estejam visíveis e legíveis'
          },
          back: {
            title: 'Foto do VERSO do Documento',
            subtitle: 'Vire o documento e mostre o verso para a câmera.',
            details: 'Certifique-se de que todas as informações do verso estejam visíveis'
          },
          selfie: {
            title: 'Sua Selfie (Foto ao Vivo)',
            subtitle: 'Tire uma foto do seu rosto olhando diretamente para a câmera.',
            details: 'Certifique-se de estar bem iluminado e com o rosto descoberto'
          }
        };

        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">{instructions[step].title}</h3>
              <p className="text-sm text-muted-foreground">{instructions[step].subtitle}</p>
              <p className="text-xs text-muted-foreground italic">{instructions[step].details}</p>
            </div>
            
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video border-4 transition-colors duration-300" 
                 style={{ borderColor: canCapture ? '#22c55e' : realtimeValidation ? '#ef4444' : '#64748b' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              />
              
              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Button onClick={startCamera} size="lg">
                    <Camera className="mr-2 h-5 w-5" />
                    Ativar Câmera
                  </Button>
                  {manualFallbackVisible && (
                    <Button 
                      onClick={() => setShowManualSubmission(true)} 
                      variant="outline"
                      size="sm"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Enviar documentos em anexo
                    </Button>
                  )}
                </div>
              )}

              {/* Feedback em tempo real */}
              {isCameraActive && realtimeValidation && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/80 text-white text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    {canCapture ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-semibold">
                      {canCapture ? '✓ Pronto para capturar!' : 'Ajustes necessários:'}
                    </span>
                  </div>
                  {!canCapture && realtimeValidation.suggestions && (
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      {realtimeValidation.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {isCameraActive && (
              <div className="space-y-2">
                <Button 
                  onClick={handleCapture} 
                  className="w-full" 
                  size="lg"
                  disabled={!canCapture}
                  variant={canCapture ? "default" : "secondary"}
                >
                  <Camera className="mr-2 h-5 w-5" />
                  {canCapture ? 'Capturar Foto' : 'Aguarde... Ajustando'}
                </Button>
                {!canCapture && (
                  <Button 
                    onClick={handleCapture} 
                    className="w-full" 
                    size="sm"
                    variant="outline"
                  >
                    Capturar Mesmo Assim
                  </Button>
                )}
                <Button 
                  onClick={() => {
                    stopCamera();
                    setShowManualSubmission(true);
                  }} 
                  className="w-full" 
                  size="sm"
                  variant="ghost"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar documentos em anexo
                </Button>
              </div>
            )}
          </div>
        );

      case 'front-preview':
      case 'back-preview':
      case 'selfie-preview':
        const previewImage = step === 'front-preview' ? frontImage : step === 'back-preview' ? backImage : selfieImage;
        const previewTitles = {
          'front-preview': 'Confira a Foto da Frente',
          'back-preview': 'Confira a Foto do Verso',
          'selfie-preview': 'Confira sua Selfie'
        };

        return (
          <div className="space-y-4">
            <DialogDescription className="text-center font-medium">
              {previewTitles[step]}
            </DialogDescription>
            
            <div className="relative bg-black rounded-lg overflow-hidden">
              <img src={previewImage!} alt="Preview" className="w-full h-auto" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleRetakePhoto} variant="outline" size="lg">
                <Camera className="mr-2 h-4 w-4" />
                Tirar Novamente
              </Button>
              <Button onClick={handleContinueFromPreview} size="lg">
                <CheckCircle className="mr-2 h-4 w-4" />
                Continuar
              </Button>
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="space-y-4 text-center py-8">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
            </div>
            <DialogDescription>
              Processando e validando seus documentos...
              <br />
              <span className="text-xs">Isso pode levar alguns segundos</span>
            </DialogDescription>
          </div>
        );

      case 'result':
        if (!verificationResult) return null;

        const isApproved = verificationResult.status === 'approved';

        return (
          <div className="space-y-4">
            <div className={`flex flex-col items-center gap-4 py-6 ${isApproved ? 'text-green-600' : 'text-destructive'}`}>
              {isApproved ? (
                <CheckCircle className="h-16 w-16" />
              ) : (
                <XCircle className="h-16 w-16" />
              )}
              <h3 className="text-xl font-bold">
                {isApproved ? 'Verificação Aprovada!' : 'Verificação Rejeitada'}
              </h3>
            </div>

            {isApproved ? (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-2">
                <p className="text-sm text-green-800">
                  Seu documento foi verificado com sucesso! Agora você pode:
                </p>
                <ul className="list-disc list-inside text-sm text-green-700">
                  <li>Criar projetos</li>
                  <li>Enviar mensagens</li>
                  <li>Utilizar todos os recursos da plataforma</li>
                </ul>
                {verificationResult.validation?.nameWasPartial && (
                  <p className="text-xs text-green-600 mt-2">
                    ℹ️ Seu nome foi atualizado para: {verificationResult.extractedData?.fullName}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-3">
                <p className="text-sm font-semibold text-red-800">Motivos da rejeição:</p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {verificationResult.rejectionReasons?.map((reason: string, i: number) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
                
                {verificationResult.requiresProfilePhotoChange && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mt-3">
                    <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Ação Necessária:</p>
                    <p className="text-sm text-amber-700">
                      Sua foto de perfil não corresponde à sua identidade verificada. 
                      Por favor, altere sua foto de perfil para uma foto real sua antes de tentar novamente.
                    </p>
                  </div>
                )}

                {/* Opções de ação */}
                <div className="space-y-2 mt-4">
                  <Button 
                    onClick={() => {
                      setStep('intro');
                      setFrontImage(null);
                      setBackImage(null);
                      setSelfieImage(null);
                      setVerificationResult(null);
                    }}
                    className="w-full"
                    size="lg"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Tentar Novamente
                  </Button>

                  <Button 
                    onClick={() => {
                      setShowManualSubmission(true);
                      onOpenChange(false);
                    }}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Enviar Documentos via Anexo
                  </Button>

                  <Button 
                    onClick={() => {
                      setShowSupportChat(true);
                      onOpenChange(false);
                    }}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Falar com o Suporte
                  </Button>
                </div>
              </div>
            )}

            {isApproved && (
              <Button 
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Fechar
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen) => {
        if (!newOpen) {
          stopCamera();
        }
        onOpenChange(newOpen);
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {step === 'intro' && 'Verificação de Identidade'}
              {step === 'front' && 'Foto do Documento - Frente'}
              {step === 'front-preview' && 'Conferir Frente do Documento'}
              {step === 'back' && 'Foto do Documento - Verso'}
              {step === 'back-preview' && 'Conferir Verso do Documento'}
              {step === 'selfie' && 'Foto do Rosto (Selfie)'}
              {step === 'selfie-preview' && 'Conferir Selfie'}
              {step === 'processing' && 'Processando...'}
              {step === 'result' && 'Resultado da Verificação'}
            </DialogTitle>
          </DialogHeader>
          {renderStepContent()}
        </DialogContent>
      </Dialog>

      <ManualDocumentSubmission
        open={showManualSubmission}
        onOpenChange={setShowManualSubmission}
        profileId={profileId}
        onSubmitSuccess={() => {
          setShowManualSubmission(false);
          onOpenChange(false);
        }}
      />

      <SupportChatDialog
        open={showSupportChat}
        onOpenChange={setShowSupportChat}
        documentRejected={true}
        profileId={profileId}
      />
    </>
  );
}
